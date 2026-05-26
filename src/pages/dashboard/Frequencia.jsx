import { useState, useEffect } from 'react';
import { Users, CheckCircle, XCircle, Clock, Loader, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import Avatar from '../../components/UI/Avatar';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { students as mockStudents, appointments as mockAppointments } from '../../data/mockData';

const STATUS_CONFIG = {
  present: { label: 'Presente', color: '#10B981', bg: '#D1FAE5', icon: CheckCircle },
  absent: { label: 'Faltou', color: '#EF4444', bg: '#FEE2E2', icon: XCircle },
  late: { label: 'Atrasado', color: '#F59E0B', bg: '#FEF3C7', icon: Clock },
};

const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function AttendanceToggle({ status, onChange }) {
  const statuses = ['present', 'absent', 'late'];
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {statuses.map(s => {
        const cfg = STATUS_CONFIG[s];
        const active = status === s;
        const Icon = cfg.icon;
        return (
          <button
            key={s}
            onClick={() => onChange(active ? null : s)}
            title={cfg.label}
            style={{
              width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: active ? cfg.bg : '#F3F4F6',
              color: active ? cfg.color : '#9CA3AF',
              transition: 'all 0.15s',
              outline: active ? `2px solid ${cfg.color}` : '2px solid transparent',
            }}
          >
            <Icon size={15} />
          </button>
        );
      })}
    </div>
  );
}

export default function Frequencia() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [attendances, setAttendances] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());

  // Load students
  useEffect(() => {
    if (!user) return;
    if (hasSupabase) {
      supabase.from('students').select('id, name, initials, color, status').eq('personal_id', user.id).then(({ data }) => {
        setStudents(data || []);
        setLoading(false);
      });
    } else {
      setStudents(mockStudents);
      setLoading(false);
    }
  }, [user?.id]);

  // Load appointments + attendances when student/month changes
  useEffect(() => {
    if (!selectedId) { setAppointments([]); setAttendances({}); return; }
    setLoadingAppts(true);

    const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-31`;

    if (hasSupabase) {
      Promise.all([
        supabase.from('appointments')
          .select('*')
          .eq('personal_id', user.id)
          .eq('student_id', selectedId)
          .gte('date', monthStart)
          .lte('date', monthEnd)
          .order('date', { ascending: true }),
        supabase.from('attendances')
          .select('*')
          .eq('personal_id', user.id)
          .eq('student_id', selectedId)
          .gte('date', monthStart)
          .lte('date', monthEnd),
      ]).then(([{ data: appts }, { data: atts }]) => {
        setAppointments(appts || []);
        const map = {};
        (atts || []).forEach(a => { map[a.date] = { status: a.status, id: a.id }; });
        setAttendances(map);
        setLoadingAppts(false);
      });
    } else {
      const appts = mockAppointments.filter(a => {
        if (String(a.studentId) !== String(selectedId)) return false;
        const d = new Date(a.date);
        return d.getFullYear() === year && d.getMonth() === month;
      });
      setAppointments(appts);
      setAttendances({});
      setLoadingAppts(false);
    }
  }, [selectedId, year, month, user?.id]);

  const handleAttendanceChange = async (appt, status) => {
    const date = appt.date || appt.date_str;
    const existing = attendances[date];

    if (!status) {
      if (existing?.id && hasSupabase) {
        await supabase.from('attendances').delete().eq('id', existing.id);
      }
      setAttendances(prev => { const next = { ...prev }; delete next[date]; return next; });
      return;
    }

    if (hasSupabase) {
      if (existing?.id) {
        await supabase.from('attendances').update({ status }).eq('id', existing.id);
        setAttendances(prev => ({ ...prev, [date]: { ...prev[date], status } }));
      } else {
        const { data } = await supabase.from('attendances').insert({
          personal_id: user.id, student_id: selectedId,
          appointment_id: appt.id, date, status,
        }).select().single();
        if (data) setAttendances(prev => ({ ...prev, [date]: { status, id: data.id } }));
      }
    } else {
      setAttendances(prev => ({ ...prev, [date]: { status } }));
    }
  };

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const selectedStudent = students.find(s => String(s.id) === String(selectedId));

  const stats = appointments.reduce((acc, appt) => {
    const date = appt.date;
    const att = attendances[date];
    if (att?.status === 'present') acc.present++;
    else if (att?.status === 'absent') acc.absent++;
    else if (att?.status === 'late') acc.late++;
    else acc.pending++;
    acc.total++;
    return acc;
  }, { total: 0, present: 0, absent: 0, late: 0, pending: 0 });

  const attendanceRate = stats.total > 0
    ? Math.round(((stats.present + stats.late) / stats.total) * 100)
    : 0;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
      <Loader size={28} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="page-padding" style={{ flex: 1 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Frequência</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6B7280' }}>Controle de presença por aluno</p>
      </div>

      {/* Student selector + month nav */}
      <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
          <Users size={16} color="#6B7280" />
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: '#111827', cursor: 'pointer', outline: 'none' }}
          >
            <option value="">Selecione um aluno...</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={prevMonth} style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ChevronLeft size={16} color="#6B7280" />
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', minWidth: 110, textAlign: 'center' }}>
            {MONTHS_PT[month]} {year}
          </span>
          <button onClick={nextMonth} style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ChevronRight size={16} color="#6B7280" />
          </button>
        </div>
      </div>

      {!selectedId ? (
        <div style={{ background: 'white', borderRadius: 12, padding: '60px 20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <Users size={48} color="#E5E7EB" style={{ marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#374151' }}>Selecione um aluno</p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#9CA3AF' }}>Escolha um aluno acima para ver e controlar as presenças</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          {selectedStudent && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }} className="freq-stats">
              <div style={{ background: 'white', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: attendanceRate >= 75 ? '#10B981' : attendanceRate >= 50 ? '#F59E0B' : '#EF4444' }}>{attendanceRate}%</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <TrendingUp size={11} /> Taxa de presença
                </p>
              </div>
              {[
                { label: 'Presenças', value: stats.present, color: '#10B981', bg: '#D1FAE5' },
                { label: 'Faltas', value: stats.absent, color: '#EF4444', bg: '#FEE2E2' },
                { label: 'Atrasos', value: stats.late, color: '#F59E0B', bg: '#FEF3C7' },
              ].map(s => (
                <div key={s.label} style={{ background: 'white', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6B7280' }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Appointments list */}
          <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                Sessões de {MONTHS_PT[month]}
              </span>
              {selectedStudent && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar initials={selectedStudent.initials || selectedStudent.name.slice(0, 2).toUpperCase()} color={selectedStudent.color || '#6B7280'} size={24} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{selectedStudent.name}</span>
                </div>
              )}
            </div>

            {loadingAppts ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Loader size={22} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : appointments.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
                <p style={{ margin: 0, fontSize: 14 }}>Nenhuma sessão agendada neste período</p>
                <p style={{ margin: '6px 0 0', fontSize: 12 }}>Crie agendamentos na página de Agenda</p>
              </div>
            ) : (
              <div>
                {appointments.map((appt, i) => {
                  const date = appt.date;
                  const att = attendances[date];
                  const dateObj = new Date(date + 'T12:00:00');
                  const isPast = dateObj < new Date();
                  const statusCfg = att?.status ? STATUS_CONFIG[att.status] : null;

                  return (
                    <div
                      key={appt.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px',
                        borderBottom: i < appointments.length - 1 ? '1px solid #F9FAFB' : 'none',
                        background: att?.status === 'absent' ? '#FFFBFB' : 'white',
                      }}
                    >
                      {/* Date */}
                      <div style={{ minWidth: 48, textAlign: 'center', flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{dateObj.getDate()}</p>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                          {dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                        </p>
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827' }}>
                          {appt.type || appt.session_type || 'Treino'}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>
                          {appt.time || ''} {appt.notes ? `· ${appt.notes}` : ''}
                        </p>
                      </div>

                      {/* Status badge */}
                      {statusCfg && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: statusCfg.bg, color: statusCfg.color, flexShrink: 0 }}>
                          {statusCfg.label}
                        </span>
                      )}

                      {/* Toggle (only for past/today sessions) */}
                      {isPast && (
                        <div style={{ flexShrink: 0 }}>
                          <AttendanceToggle status={att?.status || null} onChange={s => handleAttendanceChange(appt, s)} />
                        </div>
                      )}
                      {!isPast && (
                        <span style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>Futura</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @media (max-width: 640px) { .freq-stats { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>
    </div>
  );
}
