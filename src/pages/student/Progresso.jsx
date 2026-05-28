import { useState, useEffect } from 'react';
import { TrendingDown, TrendingUp, Plus, Ruler, Scale, X, Loader } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const MOCK = [
  { id: 1, date: '2026-03-01', weight: 82, waist: 88, chest: 102, arm: 38, hip: 96, body_fat: 18 },
  { id: 2, date: '2026-04-01', weight: 79, waist: 84, chest: 104, arm: 39, hip: 94, body_fat: 16 },
  { id: 3, date: '2026-05-01', weight: 77, waist: 81, chest: 105, arm: 40, hip: 92, body_fat: 15 },
  { id: 4, date: '2026-05-15', weight: 76.5, waist: 80, chest: 105, arm: 40.5, hip: 91, body_fat: 14.5 },
];

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

  useEffect(() => {
    if (!user) return;
    if (!hasSupabase) {
      setMeasurements(MOCK);
      setLoading(false);
      return;
    }
    const load = async () => {
      const { data: student } = await supabase
        .from('students').select('id').eq('user_id', user.id).maybeSingle();
      if (!student) { setMeasurements(MOCK); setLoading(false); return; }
      setStudentId(student.id);

      const { data } = await supabase
        .from('student_measurements')
        .select('*')
        .eq('student_id', student.id)
        .order('recorded_at');

      const normalized = (data || []).map(m => ({ ...m, date: m.recorded_at || m.date }));
      setMeasurements(normalized.length ? normalized : MOCK);
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

  const first = measurements[0];
  const last = measurements[measurements.length - 1];
  const weightDiff = first && last ? (last.weight - first.weight).toFixed(1) : 0;
  const fatDiff = first && last ? (last.body_fat - first.body_fat).toFixed(1) : 0;
  const armDiff = first && last ? (last.arm - first.arm).toFixed(1) : 0;

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
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Progresso</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6B7280' }}>{measurements.length} medições registradas</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={16} /> Registrar Medidas
        </button>
      </div>

      <div className="grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: 'Peso perdido', value: `${Math.abs(weightDiff)}kg`, sub: `De ${first?.weight}kg → ${last?.weight}kg`, trend: weightDiff < 0, color: '#3B82F6' },
          { label: 'Gordura reduzida', value: `${Math.abs(fatDiff)}%`, sub: `De ${first?.body_fat}% → ${last?.body_fat}%`, trend: fatDiff < 0, color: '#EF4444' },
          { label: 'Ganho muscular (braço)', value: `+${armDiff}cm`, sub: `De ${first?.arm}cm → ${last?.arm}cm`, trend: armDiff > 0, color: '#8B5CF6' },
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
