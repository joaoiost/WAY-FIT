import { useState, useEffect } from 'react';
import { Dumbbell, CheckCircle, Clock, Calendar, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const MOCK_HISTORY = [
  { id: 1, date: '2026-05-22', planName: 'Treino A - Peito', type: 'Musculação' },
  { id: 2, date: '2026-05-20', planName: 'Treino B - Costas', type: 'Musculação' },
  { id: 3, date: '2026-05-18', planName: 'Treino A - Peito', type: 'Musculação' },
  { id: 4, date: '2026-05-15', planName: 'Treino B - Costas', type: 'Musculação' },
  { id: 5, date: '2026-05-13', planName: 'Treino Funcional', type: 'Funcional' },
];

const TYPE_COLORS = { Musculação: '#8B5CF6', Funcional: '#10B981', Força: '#EF4444', Cardio: '#F59E0B', Hipertrofia: '#8B5CF6' };

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

export default function Historico() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user) return;
    if (!hasSupabase) {
      setHistory(MOCK_HISTORY);
      setLoading(false);
      return;
    }

    const load = async () => {
      const { data: student } = await supabase
        .from('students').select('id').eq('user_id', user.id).maybeSingle();

      if (!student) { setHistory([]); setLoading(false); return; }

      // Busca appointments 
      const { data: appts } = await supabase
        .from('appointments')
        .select('id, date, time, type, notes')
        .eq('student_id', student.id)
        .eq('status', 'done')
        .order('date', { ascending: false });

      //  (presença marcada manualmente)
      const { data: attends } = await supabase
        .from('attendances')
        .select('date')
        .eq('student_id', student.id)
        .eq('status', 'present')
        .order('date', { ascending: false });

      const apptDates = new Set((appts || []).map(a => a.date));

      const apptItems = (appts || []).map(a => ({
        id: `appt-${a.id}`,
        date: a.date,
        planName: a.notes || a.type || 'Treino',
        type: a.type || 'Musculação',
        time: a.time,
      }));

      // Adiciona attendances que não têm appointment correspondente
      const attendItems = (attends || [])
        .filter(a => !apptDates.has(a.date))
        .map(a => ({ id: `att-${a.date}`, date: a.date, planName: 'Treino', type: 'Musculação' }));

      const all = [...apptItems, ...attendItems].sort((a, b) => b.date.localeCompare(a.date));
      setHistory(all.length ? all : MOCK_HISTORY);
      setLoading(false);
    };

    load();
  }, [user?.id]);

  const allTypes = [...new Set(history.map(h => h.type))];
  const filtered = filter === 'all' ? history : history.filter(h => h.type === filter);
  const groups = groupByWeek(filtered);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const totalThisMonth = history.filter(h => h.date.startsWith(thisMonth)).length;
  const totalAll = history.length;

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
          { label: 'Treinos este mês', value: totalThisMonth, icon: '📅', color: '#3B82F6' },
          { label: 'Total de treinos', value: totalAll, icon: '🏋️', color: '#8B5CF6' },
          { label: 'Sequência atual', value: `${Math.min(totalThisMonth, 30)}`, icon: '🔥', color: '#EF4444' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>{s.icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {allTypes.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {['all', ...allTypes].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, background: filter === f ? (TYPE_COLORS[f] || '#111827') : '#F3F4F6', color: filter === f ? 'white' : '#6B7280', transition: 'all 0.15s' }}>
              {f === 'all' ? 'Todos' : f}
            </button>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 12, padding: '48px 24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <Dumbbell size={40} color="#E5E7EB" style={{ marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#6B7280' }}>Nenhum treino registrado ainda</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9CA3AF' }}>Seus treinos aparecerão aqui após serem confirmados pelo personal</p>
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
            {items.map(h => {
              const color = TYPE_COLORS[h.type] || '#6B7280';
              return (
                <div key={h.id} style={{ background: 'white', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Dumbbell size={18} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.planName}</p>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={11} />
                        {new Date(h.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      {h.time && (
                        <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} /> {h.time}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#10B981' }}>
                      <CheckCircle size={13} /> Concluído
                    </span>
                    <span style={{ background: `${color}20`, color, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>{h.type}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
