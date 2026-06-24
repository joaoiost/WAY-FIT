import { useState, useEffect } from 'react';
import { Activity, Loader, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

function calcIMC(weight, height) {
  const h = parseFloat(height) / 100, w = parseFloat(weight);
  if (!h || !w) return null;
  return (w / (h * h)).toFixed(1);
}
function imcLabel(v) {
  const n = parseFloat(v);
  if (!n) return { label: '—', color: 'var(--gray-400)' };
  if (n < 18.5) return { label: 'Abaixo do peso', color: '#3B82F6' };
  if (n < 25)   return { label: 'Peso normal',    color: '#10B981' };
  if (n < 30)   return { label: 'Sobrepeso',      color: '#F59E0B' };
  if (n < 35)   return { label: 'Obesidade I',    color: '#F97316' };
  return          { label: 'Obesidade II+',        color: '#EF4444' };
}

function StatCard({ label, value, unit, sub, color = '#111827', bg = '#F9FAFB', delta, betterLower }) {
  const diff = delta !== null && delta !== undefined ? parseFloat(delta) : null;
  const improved = diff === null ? null : betterLower ? diff < 0 : diff > 0;
  return (
    <div style={{ background: bg, borderRadius: 12, padding: '12px 14px', border: '1px solid #F1F5F9' }}>
      <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>
        {value || '—'} {value && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)' }}>{unit}</span>}
      </p>
      {sub && <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--gray-400)' }}>{sub}</p>}
      {diff !== null && diff !== 0 && (
        <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 700, color: improved ? '#10B981' : '#EF4444', display: 'flex', alignItems: 'center', gap: 3 }}>
          {improved ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
          {diff > 0 ? '+' : ''}{diff.toFixed(1)} {unit} vs anterior
        </p>
      )}
      {diff === 0 && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 3 }}><Minus size={11} /> Igual ao anterior</p>}
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: '16px 18px', marginBottom: 14, border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.07em', borderLeft: `3px solid ${color}`, paddingLeft: 10 }}>{title}</p>
      {children}
    </div>
  );
}

export default function MinhaAvaliacao() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabase || !user) { setLoading(false); return; }
    (async () => {
      const { data: student } = await supabase.from('students').select('id').eq('user_id', user.id).maybeSingle();
      if (!student) { setLoading(false); return; }
      const { data } = await supabase.from('physical_assessments').select('id, date, data').eq('student_id', student.id).order('date', { ascending: false });
      setHistory(data || []);
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <Loader size={28} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!history.length) return (
    <div className="page-padding" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: 20, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Activity size={34} color="#3B82F6" />
      </div>
      <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900, color: 'var(--gray-900)' }}>Nenhuma avaliação ainda</h3>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--gray-500)', lineHeight: 1.6 }}>Seu personal ainda não realizou uma avaliação física.</p>
    </div>
  );

  const curr = history[selectedIdx]?.data || {};
  const prev = history[selectedIdx + 1]?.data || null;
  const imc = calcIMC(curr.weight, curr.height);
  const imcInfo = imcLabel(imc);
  const delta = (key) => prev && curr[key] && prev[key] ? parseFloat(curr[key]) - parseFloat(prev[key]) : null;

  return (
    <div className="page-padding" style={{ flex: 1, maxWidth: 700, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--gray-900)' }}>Minha Avaliação</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--gray-400)' }}>{history.length} avaliação{history.length !== 1 ? 'ões' : ''} registrada{history.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Seletor de data */}
      {history.length > 1 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
          {history.map((h, i) => (
            <button key={h.id} onClick={() => setSelectedIdx(i)}
              style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 20, border: `2px solid ${i === selectedIdx ? '#3B82F6' : '#E5E7EB'}`, background: i === selectedIdx ? '#EFF6FF' : 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: i === selectedIdx ? '#1D4ED8' : '#6B7280', whiteSpace: 'nowrap' }}>
              {h.date} {i === 0 ? '(atual)' : ''}
            </button>
          ))}
        </div>
      )}

      {/* Comparativo rápido */}
      {selectedIdx === 0 && prev && (() => {
        const metrics = [
          { key: 'weight', label: 'Peso', unit: 'kg', betterLower: true },
          { key: 'bodyFat', label: '% Gordura', unit: '%', betterLower: true },
          { key: 'waist', label: 'Cintura', unit: 'cm', betterLower: true },
          { key: 'bench1rm', label: 'Supino', unit: 'kg', betterLower: false },
        ];
        const deltas = metrics.map(m => {
          const c = parseFloat(curr[m.key]), p = parseFloat(prev[m.key]);
          if (!c || !p) return null;
          const diff = c - p;
          const improved = m.betterLower ? diff < 0 : diff > 0;
          return { ...m, curr: c, prev: p, diff, improved };
        }).filter(Boolean);
        if (!deltas.length) return null;
        return (
          <div style={{ background: 'linear-gradient(135deg,#EFF6FF,#F5F3FF)', borderRadius: 16, padding: '14px 18px', marginBottom: 16, border: '1px solid #DBEAFE' }}>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Evolução vs avaliação anterior</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 8 }}>
              {deltas.map(d => (
                <div key={d.key} style={{ background: d.improved ? '#F0FDF4' : '#FEF2F2', borderRadius: 10, padding: '10px 12px', border: `1px solid ${d.improved ? '#86EFAC' : '#FECACA'}` }}>
                  <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase' }}>{d.label}</p>
                  <p style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 900, color: 'var(--gray-900)' }}>{d.curr} <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{d.unit}</span></p>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: d.improved ? '#16A34A' : '#DC2626' }}>
                    {d.diff > 0 ? '↑ +' : '↓ '}{Math.abs(d.diff).toFixed(1)} {d.unit}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Dados básicos */}
      <Section title="Dados Básicos" color="#3B82F6">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          <StatCard label="Peso" value={curr.weight} unit="kg" delta={delta('weight')} betterLower={true} />
          <StatCard label="Altura" value={curr.height} unit="cm" />
          <StatCard label="Idade" value={curr.age} unit="anos" />
          <StatCard label="IMC" value={imc} color={imcInfo.color} sub={imcInfo.label} />
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--gray-400)' }}>Data: {curr.date || history[selectedIdx]?.date || '—'}</p>
      </Section>

      {/* Composição corporal */}
      {(curr.bodyFat || curr.waist || curr.hip) && (
        <Section title="Composição Corporal" color="#8B5CF6">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {curr.bodyFat && <StatCard label="% Gordura corporal" value={curr.bodyFat} unit="%" delta={delta('bodyFat')} betterLower={true} />}
            {curr.waist   && <StatCard label="Cintura"    value={curr.waist}    unit="cm" delta={delta('waist')} betterLower={true} />}
            {curr.hip     && <StatCard label="Quadril"    value={curr.hip}      unit="cm" delta={delta('hip')} />}
            {curr.chest   && <StatCard label="Peitoral"   value={curr.chest}    unit="cm" delta={delta('chest')} betterLower={false} />}
            {curr.armRight && <StatCard label="Braço D."  value={curr.armRight} unit="cm" delta={delta('armRight')} betterLower={false} />}
            {curr.armLeft  && <StatCard label="Braço E."  value={curr.armLeft}  unit="cm" delta={delta('armLeft')} betterLower={false} />}
            {curr.thighRight && <StatCard label="Coxa D." value={curr.thighRight} unit="cm" delta={delta('thighRight')} betterLower={false} />}
            {curr.calf    && <StatCard label="Panturrilha" value={curr.calf}    unit="cm" delta={delta('calf')} betterLower={false} />}
          </div>
        </Section>
      )}

      {/* Testes físicos */}
      {(curr.bench1rm || curr.squat1rm || curr.deadlift1rm || curr.pushups || curr.situps) && (
        <Section title="Testes Físicos" color="#10B981">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {curr.bench1rm    && <StatCard label="Supino 1RM"  value={curr.bench1rm}    unit="kg" delta={delta('bench1rm')} betterLower={false} />}
            {curr.squat1rm    && <StatCard label="Agach. 1RM"  value={curr.squat1rm}    unit="kg" delta={delta('squat1rm')} betterLower={false} />}
            {curr.deadlift1rm && <StatCard label="Terra 1RM"   value={curr.deadlift1rm} unit="kg" delta={delta('deadlift1rm')} betterLower={false} />}
            {curr.pushups     && <StatCard label="Flexões"     value={curr.pushups}     unit="rep" delta={delta('pushups')} betterLower={false} />}
            {curr.situps      && <StatCard label="Abdominais"  value={curr.situps}      unit="rep" delta={delta('situps')} betterLower={false} />}
          </div>
        </Section>
      )}

      {/* Observações */}
      {curr.recommendation && (
        <div style={{ background: 'linear-gradient(135deg,#EFF6FF,#F5F3FF)', borderRadius: 14, padding: '14px 18px', marginBottom: 20, border: '1px solid #DBEAFE' }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recomendações do personal</p>
          <p style={{ margin: 0, fontSize: 14, color: '#1E3A5F', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{curr.recommendation}</p>
        </div>
      )}
      {curr.obs && (
        <div style={{ background: '#FFFBEB', borderRadius: 14, padding: '14px 18px', marginBottom: 20, border: '1px solid #FDE68A' }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Observações</p>
          <p style={{ margin: 0, fontSize: 14, color: '#78350F', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{curr.obs}</p>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

