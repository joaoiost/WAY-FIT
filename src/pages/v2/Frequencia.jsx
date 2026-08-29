import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Users, CheckCircle2, XCircle, Clock, TrendingUp, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { todayLocal } from '../../lib/date';
import StudentPicker from '../../components/v2/StudentPicker';
import ModalV2 from '../../components/v2/Modal';

const STATUS = {
  present: { label: 'Presente', color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
  absent: { label: 'Faltou', color: '#DC2626', bg: '#FEF2F2', icon: XCircle },
  late: { label: 'Atrasado', color: '#D97706', bg: '#FFFBEB', icon: Clock },
};
const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function rateColor(rate) {
  if (rate >= 75) return 'text-success-500';
  if (rate >= 50) return 'text-warning-500';
  return 'text-danger-500';
}

function computeRate(studentId, appointments, attendances) {
  const today = todayLocal();
  const dueAppts = appointments.filter(a => String(a.student_id) === String(studentId) && a.date <= today);
  if (dueAppts.length === 0) return null;
  const present = dueAppts.filter(a => {
    const att = attendances.find(x => String(x.student_id) === String(studentId) && x.date === a.date);
    return att && (att.status === 'present' || att.status === 'late');
  }).length;
  return Math.round((present / dueAppts.length) * 100);
}

export default function FrequenciaV2() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selStudent, setSelStudent] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [logModal, setLogModal] = useState(false);
  const [logForm, setLogForm] = useState({ date: todayLocal(), status: 'present' });

  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-31`;

  useEffect(() => {
    if (!user || !hasSupabase) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      supabase.from('students').select('id, name, initials, color, status').eq('personal_id', user.id).eq('status', 'ativo').order('name'),
      supabase.from('appointments').select('*').eq('personal_id', user.id).gte('date', monthStart).lte('date', monthEnd).order('date'),
      supabase.from('attendances').select('*').eq('personal_id', user.id).gte('date', monthStart).lte('date', monthEnd),
    ]).then(([{ data: s }, { data: appts }, { data: atts }]) => {
      setStudents(s || []);
      setAppointments(appts || []);
      setAttendances(atts || []);
      setLoading(false);
    });
  }, [user?.id, year, month]);

  const summaries = useMemo(() => {
    return students.map(s => ({ student: s, rate: computeRate(s.id, appointments, attendances) }))
      .sort((a, b) => (a.rate ?? 101) - (b.rate ?? 101));
  }, [students, appointments, attendances]);

  const studentAppts = useMemo(
    () => appointments.filter(a => String(a.student_id) === String(selStudent)).sort((a, b) => a.date.localeCompare(b.date)),
    [appointments, selStudent]
  );
  const studentAtts = useMemo(() => {
    const map = {};
    attendances.filter(a => String(a.student_id) === String(selStudent)).forEach(a => { map[a.date] = a; });
    return map;
  }, [attendances, selStudent]);

  const stats = studentAppts.reduce((acc, appt) => {
    const att = studentAtts[appt.date];
    if (att?.status === 'present') acc.present++;
    else if (att?.status === 'absent') acc.absent++;
    else if (att?.status === 'late') acc.late++;
    else acc.pending++;
    acc.total++;
    return acc;
  }, { total: 0, present: 0, absent: 0, late: 0, pending: 0 });
  const attendanceRate = stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : null;

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const handleAttendanceChange = async (appt, status) => {
    const date = appt.date;
    const existing = studentAtts[date];
    if (!status) {
      if (existing?.id) await supabase.from('attendances').delete().eq('id', existing.id);
      setAttendances(prev => prev.filter(a => a.id !== existing?.id));
      return;
    }
    if (existing?.id) {
      await supabase.from('attendances').update({ status }).eq('id', existing.id);
      setAttendances(prev => prev.map(a => a.id === existing.id ? { ...a, status } : a));
    } else {
      const { data } = await supabase.from('attendances').insert({
        personal_id: user.id, student_id: selStudent, appointment_id: appt.id, date, status,
      }).select().single();
      if (data) setAttendances(prev => [...prev, data]);
    }
  };

  const handleLogWithoutAppointment = async () => {
    const { data, error } = await supabase.from('attendances').upsert({
      personal_id: user.id, student_id: selStudent, appointment_id: null, date: logForm.date, status: logForm.status,
    }, { onConflict: 'student_id,date' }).select().single();
    if (error) { toast.error('Não foi possível registrar.'); return; }
    setAttendances(prev => [...prev.filter(a => !(a.student_id === selStudent && a.date === logForm.date)), data]);
    setLogModal(false);
    toast.success('Presença registrada!');
  };

  const selectedStudentObj = students.find(s => s.id === selStudent);

  if (loading) return <div className="py-24 text-center text-sm text-ink-400">Carregando...</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink-900">Frequência</h2>
          <p className="text-[13px] text-ink-500 mt-0.5">Controle de presença por aluno</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-8 h-8 rounded-lg border border-ink-200 flex items-center justify-center text-ink-500 hover:bg-ink-50"><ChevronLeft size={15} /></button>
          <span className="text-[13px] font-bold text-ink-900 min-w-[120px] text-center">{MONTHS_PT[month]} {year}</span>
          <button onClick={nextMonth} className="w-8 h-8 rounded-lg border border-ink-200 flex items-center justify-center text-ink-500 hover:bg-ink-50"><ChevronRight size={15} /></button>
        </div>
      </div>

      <div className="max-w-xs">
        <StudentPicker students={students} value={selStudent} onChange={setSelStudent} placeholder="Todos os alunos (visão geral)" />
      </div>

      {!selStudent ? (
        <div className="bg-white border border-ink-100 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100">
            <p className="text-[13px] font-bold text-ink-900">Todos os alunos</p>
            <p className="text-[11.5px] text-ink-500">ordenado por menor frequência</p>
          </div>
          {summaries.length === 0 ? (
            <div className="py-16 text-center"><p className="text-[13px] text-ink-500">Nenhum aluno ativo.</p></div>
          ) : summaries.map(({ student, rate }) => (
            <button
              key={student.id}
              onClick={() => setSelStudent(student.id)}
              className="w-full flex items-center gap-3 px-4 py-3 border-b border-ink-50 last:border-0 hover:bg-ink-50/60 text-left"
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0" style={{ background: student.color || '#64748B' }}>
                {student.initials || student.name.slice(0, 2).toUpperCase()}
              </div>
              <p className="flex-1 text-[13.5px] font-medium text-ink-900 truncate">{student.name}</p>
              {rate === null ? (
                <span className="text-[12px] text-ink-400">sem sessões no mês</span>
              ) : (
                <span className={`text-[14px] font-bold ${rateColor(rate)}`}>{rate}%</span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white border border-ink-100 rounded-xl p-3.5 text-center">
              <p className={`text-2xl font-extrabold ${attendanceRate !== null ? rateColor(attendanceRate) : 'text-ink-300'}`}>{attendanceRate !== null ? `${attendanceRate}%` : '—'}</p>
              <p className="text-[11px] text-ink-500 flex items-center justify-center gap-1 mt-0.5"><TrendingUp size={11} /> Taxa de presença</p>
            </div>
            {[
              { l: 'Presenças', v: stats.present, c: 'text-success-500' },
              { l: 'Faltas', v: stats.absent, c: 'text-danger-500' },
              { l: 'Atrasos', v: stats.late, c: 'text-warning-500' },
            ].map(s => (
              <div key={s.l} className="bg-white border border-ink-100 rounded-xl p-3.5 text-center">
                <p className={`text-2xl font-extrabold ${s.c}`}>{s.v}</p>
                <p className="text-[11px] text-ink-500 mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-ink-100 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100">
              <p className="text-[13px] font-bold text-ink-900">Sessões de {MONTHS_PT[month]} — {selectedStudentObj?.name}</p>
              <button onClick={() => { setLogForm({ date: todayLocal(), status: 'present' }); setLogModal(true); }} className="flex items-center gap-1 text-[12px] font-semibold text-brand-600 hover:text-brand-700">
                <Plus size={13} /> Registrar presença
              </button>
            </div>

            {studentAppts.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[13px] text-ink-500">Nenhuma sessão agendada neste período.</p>
              </div>
            ) : (
              <div className="px-4">
                {studentAppts.map(appt => {
                  const att = studentAtts[appt.date];
                  const dateObj = new Date(appt.date + 'T12:00:00');
                  const isPast = dateObj < new Date();
                  const cfg = att?.status ? STATUS[att.status] : null;
                  return (
                    <div key={appt.id} className="flex items-center gap-3 py-2.5 border-b border-ink-50 last:border-0">
                      <div className="w-10 text-center shrink-0">
                        <p className="text-[17px] font-extrabold text-ink-900 leading-none">{dateObj.getDate()}</p>
                        <p className="text-[9.5px] font-bold uppercase text-ink-400">{dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-ink-900">{appt.type || 'Treino'}</p>
                        <p className="text-[11.5px] text-ink-400">{appt.time || ''}</p>
                      </div>
                      {cfg && <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>}
                      {isPast ? (
                        <div className="flex gap-1 shrink-0">
                          {Object.entries(STATUS).map(([key, cfgS]) => {
                            const Icon = cfgS.icon;
                            const active = att?.status === key;
                            return (
                              <button
                                key={key}
                                onClick={() => handleAttendanceChange(appt, active ? null : key)}
                                title={cfgS.label}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                style={{ background: active ? cfgS.bg : '#F1F5F9', color: active ? cfgS.color : '#94A3B8' }}
                              >
                                <Icon size={14} />
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[11px] text-ink-400 shrink-0">Futura</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <ModalV2
        isOpen={logModal}
        onClose={() => setLogModal(false)}
        title="Registrar presença"
        footer={
          <>
            <button onClick={() => setLogModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-ink-500 hover:bg-ink-50">Cancelar</button>
            <button onClick={handleLogWithoutAppointment} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700">Registrar</button>
          </>
        }
      >
        <div className="flex flex-col gap-3.5">
          <p className="text-[12.5px] text-ink-500">Registra a presença desse aluno num dia, mesmo sem uma aula agendada antes.</p>
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">Data</label>
            <input type="date" value={logForm.date} onChange={(e) => setLogForm(p => ({ ...p, date: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">Status</label>
            <div className="flex gap-2">
              {Object.entries(STATUS).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setLogForm(p => ({ ...p, status: key }))}
                  className={`flex-1 py-2 rounded-lg text-[12.5px] font-semibold border ${logForm.status === key ? 'text-white' : 'bg-white border-ink-200 text-ink-600'}`}
                  style={logForm.status === key ? { background: cfg.color, borderColor: cfg.color } : undefined}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ModalV2>
    </div>
  );
}
