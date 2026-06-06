import { useState, useEffect } from 'react';
import { Dumbbell, CheckCircle, Clock, Calendar, ChevronDown, ChevronUp, Loader, BarChart2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';


const TYPE_COLORS = {
  Hipertrofia: '#8B5CF6', Funcional: '#10B981', Força: '#EF4444',
  Cardio: '#F59E0B', Resistência: '#3B82F6', Mobilidade: '#06B6D4',
  Musculação: '#8B5CF6',
};

function groupByWeek(items) {
  const groups = {};
  items.forEach(item => {
    const date = new Date(item.date + 'T12:00:00');
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

function weekLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const end = new Date(d.getTime() + 6 * 86400000);
  const fmt = (dt) => dt.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  return `${fmt(d)} – ${fmt(end)}`;
}

function SessionCard({ session, isMock }) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const color = TYPE_COLORS[session.plan_type] || '#6B7280';
  const pct = session.exercises_total > 0 ? Math.round((session.exercises_done / session.exercises_total) * 100) : 0;

  const handleToggle = async () => {
    setOpen(prev => !prev);
    if (!open && logs === null && !isMock && hasSupabase) {
      setLoadingLogs(true);
      const { data } = await supabase
        .from('exercise_logs')
        .select('exercise_name, sets_planned, reps_planned, load_planned, load_actual, done')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true });
      setLogs(data || []);
      setLoadingLogs(false);
    }
  };

  return (
    <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
      <button
        onClick={handleToggle}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Dumbbell size={18} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.plan_name}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={11} />
              {new Date(session.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            {session.exercises_total > 0 && (
              <span style={{ fontSize: 12, color: '#6B7280' }}>
                {session.exercises_done}/{session.exercises_total} exercícios
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: pct === 100 ? '#10B981' : '#F59E0B' }}>
            <CheckCircle size={13} /> {pct === 100 ? 'Completo' : `${pct}%`}
          </span>
          <span style={{ background: `${color}20`, color, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>{session.plan_type}</span>
        </div>
        {open ? <ChevronUp size={16} color="#9CA3AF" style={{ flexShrink: 0 }} /> : <ChevronDown size={16} color="#9CA3AF" style={{ flexShrink: 0 }} />}
      </button>

      {open && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid #F3F4F6' }}>
          {loadingLogs ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
              <Loader size={18} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : isMock ? (
            <p style={{ margin: '12px 0 0', fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>Detalhes disponíveis nos treinos registrados pelo app</p>
          ) : logs && logs.length === 0 ? (
            <p style={{ margin: '12px 0 0', fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>Nenhum detalhe registrado nessa sessão</p>
          ) : (
            <div style={{ paddingTop: 10 }}>
              {(logs || []).map((log, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < logs.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: log.done ? '#D1FAE5' : '#F3F4F6', border: `1.5px solid ${log.done ? '#10B981' : '#E5E7EB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {log.done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: log.done ? '#111827' : '#9CA3AF' }}>{log.exercise_name}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9CA3AF' }}>
                      {log.sets_planned}x · {log.reps_planned} reps
                      {log.load_planned ? ` · prescrito: ${log.load_planned}` : ''}
                    </p>
                  </div>
                  {log.load_actual && (
                    <div style={{ background: '#EFF6FF', borderRadius: 6, padding: '3px 8px', textAlign: 'center', flexShrink: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#3B82F6' }}>{log.load_actual}</p>
                      <p style={{ margin: 0, fontSize: 9, color: '#93C5FD' }}>usado</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Historico() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user) return;
    if (!hasSupabase) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const load = async () => {
      const { data: student } = await supabase
        .from('students').select('id').eq('user_id', user.id).maybeSingle();

      if (!student) { setSessions([]); setLoading(false); return; }

      const { data: ws } = await supabase
        .from('workout_sessions')
        .select('id, date, plan_name, plan_type, exercises_done, exercises_total, finished_at')
        .eq('student_id', student.id)
        .order('date', { ascending: false })
        .limit(100);

      if (ws && ws.length > 0) {
        setSessions(ws);
        setLoading(false);
        return;
      }

      // Fallback: appointments + attendances for users who haven't used the new system yet
      const [{ data: appts }, { data: attends }] = await Promise.all([
        supabase.from('appointments').select('id, date, time, type, notes').eq('student_id', student.id).eq('status', 'done').order('date', { ascending: false }),
        supabase.from('attendances').select('date').eq('student_id', student.id).eq('status', 'present').order('date', { ascending: false }),
      ]);

      const apptDates = new Set((appts || []).map(a => a.date));
      const apptItems = (appts || []).map(a => ({
        id: `appt-${a.id}`, date: a.date, plan_name: a.notes || a.type || 'Treino',
        plan_type: a.type || 'Musculação', exercises_done: 0, exercises_total: 0,
      }));
      const attendItems = (attends || [])
        .filter(a => !apptDates.has(a.date))
        .map(a => ({ id: `att-${a.date}`, date: a.date, plan_name: 'Treino', plan_type: 'Musculação', exercises_done: 0, exercises_total: 0 }));

      const all = [...apptItems, ...attendItems].sort((a, b) => b.date.localeCompare(a.date));
      setSessions(all);
      setLoading(false);
    };

    load();
  }, [user?.id]);

  const allTypes = [...new Set(sessions.map(s => s.plan_type).filter(Boolean))];
  const filtered = filter === 'all' ? sessions : sessions.filter(s => s.plan_type === filter);
  const groups = groupByWeek(filtered);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const totalThisMonth = sessions.filter(s => s.date.startsWith(thisMonth)).length;
  const totalAll = sessions.length;
  const completedAll = sessions.filter(s => !s._mock && (s.exercises_total === 0 || s.exercises_done === s.exercises_total)).length;

  if (loading) {
    return (
      <div className="page-padding" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <Loader size={24} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div className="page-padding" style={{ flex: 1 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Histórico de Treinos</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6B7280' }}>{totalAll} treino{totalAll !== 1 ? 's' : ''} registrado{totalAll !== 1 ? 's' : ''}</p>
      </div>

      <div className="grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: 'Treinos este mês', value: totalThisMonth, Icon: Calendar,   color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Total de treinos', value: totalAll,        Icon: Dumbbell,   color: '#8B5CF6', bg: '#F5F3FF' },
          { label: 'Completos',        value: completedAll || totalAll, Icon: CheckCircle, color: '#10B981', bg: '#ECFDF5' },
        ].map(({ label, value, Icon, color, bg }) => (
          <div key={label} style={{ background: 'white', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color }}>{value}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {allTypes.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {['all', ...allTypes].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ fontSize: 13, padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, background: filter === f ? (TYPE_COLORS[f] || '#111827') : '#F3F4F6', color: filter === f ? 'white' : '#6B7280', transition: 'all 0.15s' }}>
              {f === 'all' ? 'Todos' : f}
            </button>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 12, padding: '48px 24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <Dumbbell size={40} color="#E5E7EB" style={{ marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#6B7280' }}>Nenhum treino registrado ainda</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9CA3AF' }}>Complete seus primeiros exercícios em Meus Treinos</p>
        </div>
      ) : groups.map(([weekKey, items]) => (
        <div key={weekKey} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {weekLabel(weekKey)}
            </span>
            <span style={{ background: '#EFF6FF', color: '#3B82F6', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
              {items.length} treino{items.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(session => (
              <SessionCard key={session.id} session={session} isMock={!!session._mock} />
            ))}
          </div>
        </div>
      ))}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
