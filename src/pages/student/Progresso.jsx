import { useState, useEffect } from 'react';
import { TrendingDown, TrendingUp, Plus, Ruler, Scale, X, Loader, Zap, BarChart2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';


const EMPTY_FORM = { date: new Date().toISOString().slice(0, 10), weight: '', waist: '', chest: '', arm: '', hip: '', body_fat: '' };

export default function Progresso() {
  const { user } = useAuth();
  const [studentId, setStudentId] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeMetric, setActiveMetric] = useState('weight');
  const [exerciseLogs, setExerciseLogs] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState('');

  useEffect(() => {
    if (!user) return;
    if (!hasSupabase) {
      setMeasurements([]);
      setLoading(false);
      return;
    }
    const load = async () => {
      const { data: student } = await supabase
        .from('students').select('id').eq('user_id', user.id).maybeSingle();
      if (!student) { setMeasurements([]); setLoading(false); return; }
      setStudentId(student.id);

      const [{ data }, { data: logs }] = await Promise.all([
        supabase.from('student_measurements').select('*').eq('student_id', student.id).order('recorded_at'),
        supabase.from('exercise_logs').select('exercise_name, load_actual, reps_planned, sets_planned, created_at').eq('student_id', student.id).not('load_actual', 'is', null).eq('done', true).order('created_at').limit(500),
      ]);

      const normalized = (data || []).map(m => ({ ...m, date: m.recorded_at || m.date }));
      setMeasurements(normalized);
      setExerciseLogs(logs || []);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const m = { ...form, weight: +form.weight, waist: +form.waist, chest: +form.chest, arm: +form.arm, hip: +form.hip, body_fat: +form.body_fat };

    if (hasSupabase && studentId) {
      const { data } = await supabase
        .from('student_measurements')
        .insert({ student_id: studentId, recorded_at: m.date, weight: m.weight, waist: m.waist, chest: m.chest, arm: m.arm, hip: m.hip, body_fat: m.body_fat })
        .select().single();
      if (data) {
        const normalized = { ...data, date: data.recorded_at || data.date };
        setMeasurements(prev => [...prev, normalized].sort((a, b) => (a.date||'').localeCompare(b.date||'')));
      }
    } else {
      const newM = { ...m, id: Date.now() };
      setMeasurements(prev => [...prev, newM].sort((a, b) => (a.date||'').localeCompare(b.date||'')));
    }

    setSaving(false);
    setModal(false);
    setForm(EMPTY_FORM);
  };

  const hasData = measurements.length > 0;
  const first = hasData ? measurements[0] : null;
  const last = hasData ? measurements[measurements.length - 1] : null;
  const weightDiff = first && last && first.weight != null && last.weight != null ? +(last.weight - first.weight).toFixed(1) : null;
  const fatDiff = first && last && first.body_fat != null && last.body_fat != null ? +(last.body_fat - first.body_fat).toFixed(1) : null;
  const armDiff = first && last && first.arm != null && last.arm != null ? +(last.arm - first.arm).toFixed(1) : null;

  const chartData = measurements.map(m => ({
    ...m,
    dateLabel: new Date(m.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }),
  }));

  const METRICS = [
    { key: 'weight', label: 'Peso (kg)', color: '#3B82F6' },
    { key: 'body_fat', label: '% Gordura', color: '#EF4444' },
    { key: 'waist', label: 'Cintura (cm)', color: '#F59E0B' },
    { key: 'chest', label: 'Peito (cm)', color: '#10B981' },
    { key: 'arm', label: 'Braço (cm)', color: '#8B5CF6' },
  ];

  const selected = METRICS.find(m => m.key === activeMetric);

  const exerciseNames = [...new Set(exerciseLogs.map(l => l.exercise_name))].filter(Boolean).sort();
  const loadChartData = selectedExercise
    ? exerciseLogs
        .filter(l => l.exercise_name === selectedExercise)
        .map(l => ({
          date: new Date(l.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }),
          load: parseFloat(l.load_actual),
        }))
    : [];
  const firstLoad = loadChartData[0]?.load;
  const lastLoad = loadChartData[loadChartData.length - 1]?.load;
  const diffLoad = firstLoad != null && lastLoad != null ? +(lastLoad - firstLoad).toFixed(1) : null;

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--gray-900)' }}>Progresso</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--gray-400)' }}>{measurements.length} medições registradas</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={16} /> Registrar Medidas
        </button>
      </div>

      <div className="grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: 'Variação de peso', value: weightDiff !== null ? `${weightDiff > 0 ? '+' : ''}${weightDiff}kg` : '—', sub: first && last ? `De ${first.weight}kg → ${last.weight}kg` : 'Sem dados ainda', trend: weightDiff !== null && weightDiff < 0, color: '#3B82F6' },
          { label: 'Variação de gordura', value: fatDiff !== null ? `${fatDiff > 0 ? '+' : ''}${fatDiff}%` : '—', sub: first && last ? `De ${first.body_fat}% → ${last.body_fat}%` : 'Sem dados ainda', trend: fatDiff !== null && fatDiff < 0, color: '#EF4444' },
          { label: 'Evolução do braço', value: armDiff !== null ? `${armDiff > 0 ? '+' : ''}${armDiff}cm` : '—', sub: first && last ? `De ${first.arm}cm → ${last.arm}cm` : 'Sem dados ainda', trend: armDiff !== null && armDiff > 0, color: '#8B5CF6' },
        ].map(c => (
          <div key={c.label} style={{ background: 'white', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>{c.label}</span>
              {c.trend ? <TrendingDown size={16} color={c.color} /> : <TrendingUp size={16} color={c.color} />}
            </div>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: c.color }}>{c.value}</p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9CA3AF' }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {!hasData && (
        <div style={{ background: 'white', borderRadius: 12, padding: '48px 24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 20 }}>
          <Scale size={40} color="#E5E7EB" style={{ marginBottom: 12 }} />
          <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#374151' }}>Nenhuma medição ainda</p>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#9CA3AF' }}>Registre sua primeira medição para acompanhar a evolução</p>
          <button className="btn-primary" onClick={() => setModal(true)}>
            <Plus size={16} /> Registrar Medidas
          </button>
        </div>
      )}

      {hasData && (
        <>
          <div style={{ background: 'white', borderRadius: 12, padding: '20px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Evolução ao longo do tempo</h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {METRICS.map(m => (
                  <button key={m.key} onClick={() => setActiveMetric(m.key)} style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', background: activeMetric === m.key ? m.color : '#F3F4F6', color: activeMetric === m.key ? 'white' : '#6B7280', transition: 'all 0.15s' }}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} width={40} />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', fontSize: 13 }} />
                <Line type="monotone" dataKey={activeMetric} stroke={selected?.color} strokeWidth={2.5} dot={{ r: 4, fill: selected?.color }} name={selected?.label} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid #F3F4F6' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Histórico de Medições</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    {['Data', 'Peso', '% Gord.', 'Cintura', 'Peito', 'Braço', 'Quadril'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...measurements].reverse().map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #F9FAFB' }} className="table-row">
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#374151' }}>{new Date(m.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                      <td style={{ padding: '12px 14px', color: '#3B82F6', fontWeight: 700 }}>{m.weight}kg</td>
                      <td style={{ padding: '12px 14px', color: '#EF4444', fontWeight: 700 }}>{m.body_fat}%</td>
                      <td style={{ padding: '12px 14px', color: '#374151' }}>{m.waist}cm</td>
                      <td style={{ padding: '12px 14px', color: '#374151' }}>{m.chest}cm</td>
                      <td style={{ padding: '12px 14px', color: '#8B5CF6', fontWeight: 700 }}>{m.arm}cm</td>
                      <td style={{ padding: '12px 14px', color: '#374151' }}>{m.hip}cm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Evolução de cargas por exercício */}
      {exerciseLogs.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, padding: '20px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Evolução de Cargas</h3>
            <select value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 13, color: '#374151', outline: 'none', background: 'white', maxWidth: 240 }}>
              <option value="">Selecione um exercício</option>
              {exerciseNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {selectedExercise && loadChartData.length > 0 && (
            <>
              {diffLoad !== null && (
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Carga inicial', value: `${firstLoad}kg`, color: '#9CA3AF' },
                    { label: 'Carga atual', value: `${lastLoad}kg`, color: '#3B82F6' },
                    { label: 'Evolução', value: `${diffLoad >= 0 ? '+' : ''}${diffLoad}kg`, color: diffLoad >= 0 ? '#10B981' : '#EF4444' },
                    { label: 'Sessões', value: loadChartData.length, color: '#8B5CF6' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 14px' }}>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9CA3AF' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={loadChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} width={42} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', fontSize: 13 }} />
                  <Line type="monotone" dataKey="load" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: '#3B82F6' }} name="Carga (kg)" />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
          {!selectedExercise && (
            <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '16px 0' }}>Selecione um exercício para ver a evolução de carga</p>
          )}
        </div>
      )}

      {/* 1RM Estimation */}
      {exerciseLogs.length > 0 && (() => {
        function calc1RM(w, r) { return w > 0 && r > 0 ? Math.round(w * (1 + r / 30) * 10) / 10 : 0; }
        const exMap = {};
        exerciseLogs.forEach(log => {
          const est = calc1RM(parseFloat(log.load_actual) || 0, parseInt(log.reps_planned) || 0);
          if (est > 0 && (!exMap[log.exercise_name] || est > exMap[log.exercise_name].est1rm)) {
            exMap[log.exercise_name] = { name: log.exercise_name, load: log.load_actual, reps: log.reps_planned, est1rm: est };
          }
        });
        const top = Object.values(exMap).sort((a, b) => b.est1rm - a.est1rm).slice(0, 8);
        if (top.length === 0) return null;
        return (
          <div style={{ background: 'white', borderRadius: 12, padding: '20px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Zap size={16} color="#F59E0B" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Estimativa de Força (1RM)</h3>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#9CA3AF', fontStyle: 'italic' }}>Fórmula de Epley</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {top.map((item, i) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: '#F9FAFB' }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#D1D5DB', minWidth: 20 }}>#{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>base: {item.load}kg × {item.reps} reps</p>
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 900, color: '#3B82F6', flexShrink: 0 }}>{item.est1rm}kg</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Weekly Volume Chart */}
      {exerciseLogs.length >= 3 && (() => {
        function getWeekKey(d) { const dt = new Date(d); dt.setDate(dt.getDate() - dt.getDay()); return dt.toISOString().slice(0, 10); }
        const wv = {};
        exerciseLogs.forEach(log => {
          const w = getWeekKey(log.created_at);
          wv[w] = (wv[w] || 0) + (parseFloat(log.load_actual) || 0) * (parseInt(log.reps_planned) || 0);
        });
        const weeks = Object.keys(wv).sort().slice(-8);
        const vals = weeks.map(w => wv[w]);
        const maxV = Math.max(...vals, 1);
        if (weeks.length < 2) return null;
        const thisWeek = wv[getWeekKey(new Date().toISOString())] || 0;
        return (
          <div style={{ background: 'white', borderRadius: 12, padding: '20px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <BarChart2 size={16} color="#8B5CF6" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Volume Semanal</h3>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: '#9CA3AF' }}>Esta semana: {Math.round(thisWeek / 100) / 10}t de volume total</p>
            <svg viewBox="0 0 300 110" style={{ width: '100%', height: 120, display: 'block' }} preserveAspectRatio="none">
              {[0.25, 0.5, 0.75, 1].map(pct => (
                <line key={pct} x1={0} y1={90 - pct * 86} x2={300} y2={90 - pct * 86} stroke="#F3F4F6" strokeWidth={0.8} />
              ))}
              {weeks.map((week, i) => {
                const gap = 300 / weeks.length;
                const barW = gap * 0.55;
                const x = gap * i + gap / 2 - barW / 2;
                const barH = vals[i] > 0 ? Math.max(4, (vals[i] / maxV) * 86) : 2;
                const label = new Date(week + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('. de ', '/').replace('.', '').slice(0, 6);
                return (
                  <g key={week}>
                    <rect x={x} y={90 - barH} width={barW} height={barH} fill="#8B5CF6" opacity={0.75} rx={3} />
                    <text x={gap * i + gap / 2} y={106} textAnchor="middle" fontSize={7} fill="#9CA3AF">{label}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        );
      })()}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #F3F4F6' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Registrar Medidas</h3>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', display: 'flex' }}><X size={20} /></button>
            </div>
            <form onSubmit={save} style={{ padding: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><label>Data</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[['weight', 'Peso (kg)'], ['body_fat', '% Gordura Corporal'], ['waist', 'Cintura (cm)'], ['chest', 'Peito (cm)'], ['arm', 'Braço (cm)'], ['hip', 'Quadril (cm)']].map(([key, label]) => (
                    <div key={key}><label>{label}</label><input type="number" step="0.1" placeholder="0.0" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} required /></div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid #F3F4F6' }}>
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Medidas'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
