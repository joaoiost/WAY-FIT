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
      <div className="page-header">
        <div>
          <h2 className="page-title">Frequência</h2>
          <p className="page-subtitle">Controle de presença por aluno</p>
        </div>
      </div>

      {/* Student selector + month nav */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
          <Users size={16} color="var(--gray-400)" />
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: 'var(--gray-900)', cursor: 'pointer', outline: 'none' }}>
            <option value="">Selecione um aluno...</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={prevMonth} className="icon-box icon-box-md icon-box-gray" style={{ border: 'none', cursor: 'pointer' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-900)', minWidth: 110, textAlign: 'center' }}>
            {MONTHS_PT[month]} {year}
          </span>
          <button onClick={nextMonth} className="icon-box icon-box-md icon-box-gray" style={{ border: 'none', cursor: 'pointer' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {!selectedId ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={26} /></div>
            <p className="empty-state-title">Selecione um aluno</p>
            <p className="empty-state-desc">Escolha um aluno acima para ver e controlar as presenças</p>
          </div>
        </div>
      ) : (
        <>
          {/* Stats */}
          {selectedStudent && (
            <div className="kpi-grid freq-stats" style={{ marginBottom: 20 }}>
              <div className="kpi-card" style={{ textAlign: 'center', cursor: 'default' }}>
                <p className="kpi-card-value" style={{ color: attendanceRate >= 75 ? 'var(--green)' : attendanceRate >= 50 ? 'var(--yellow)' : 'var(--red)' }}>{attendanceRate}%</p>
                <p className="kpi-card-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <TrendingUp size={11} /> Taxa de presença
                </p>
              </div>
              {[
                { label: 'Presenças', value: stats.present, color: 'var(--green)' },
                { label: 'Faltas', value: stats.absent, color: 'var(--red)' },
                { label: 'Atrasos', value: stats.late, color: 'var(--yellow)' },
              ].map(s => (
                <div key={s.label} className="kpi-card" style={{ textAlign: 'center', cursor: 'default' }}>
                  <p className="kpi-card-value" style={{ color: s.color }}>{s.value}</p>
                  <p className="kpi-card-label">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Appointments list */}
          <div className="card card-0">
            <div className="card-header">
              <span className="section-title">Sessões de {MONTHS_PT[month]}</span>
              {selectedStudent && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar initials={selectedStudent.initials || selectedStudent.name.slice(0, 2).toUpperCase()} color={selectedStudent.color || '#6B7280'} size={24} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)' }}>{selectedStudent.name}</span>
                </div>
              )}
            </div>

            {loadingAppts ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Loader size={22} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : appointments.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-title">Nenhuma sessão agendada neste período</p>
                <p className="empty-state-desc">Crie agendamentos na página de Agenda</p>
              </div>
            ) : (
              <div style={{ padding: '0 20px' }}>
                {appointments.map((appt, i) => {
                  const date = appt.date;
                  const att = attendances[date];
                  const dateObj = new Date(date + 'T12:00:00');
                  const isPast = dateObj < new Date();
                  const statusCfg = att?.status ? STATUS_CONFIG[att.status] : null;

                  return (
                    <div key={appt.id} className="list-row"
                      style={{ background: att?.status === 'absent' ? '#FFFBFB' : 'transparent' }}>
                      {/* Date */}
                      <div style={{ minWidth: 44, textAlign: 'center', flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--gray-900)', lineHeight: 1 }}>{dateObj.getDate()}</p>
                        <p className="section-label" style={{ margin: 0 }}>
                          {dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                        </p>
                      </div>

                      {/* Info */}
                      <div className="list-row-body">
                        <p className="list-row-title">{appt.type || appt.session_type || 'Treino'}</p>
                        <p className="list-row-sub">{appt.time || ''} {appt.notes ? `· ${appt.notes}` : ''}</p>
                      </div>

                      {/* Status badge */}
                      {statusCfg && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: statusCfg.bg, color: statusCfg.color, flexShrink: 0 }}>
                          {statusCfg.label}
                        </span>
                      )}

                      {isPast ? (
                        <div style={{ flexShrink: 0 }}>
                          <AttendanceToggle status={att?.status || null} onChange={s => handleAttendanceChange(appt, s)} />
                        </div>
                      ) : (
                        <span className="list-row-sub" style={{ flexShrink: 0 }}>Futura</span>
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
