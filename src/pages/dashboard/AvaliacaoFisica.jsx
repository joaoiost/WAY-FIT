import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, FileText, Plus, ChevronDown, Check, Loader, TrendingUp, Activity, Dumbbell, Scale, Ruler } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Cálculos ─────────────────────────────────────────────────
function calcIMC(weight, height) {
  const h = parseFloat(height) / 100;
  const w = parseFloat(weight);
  if (!h || !w) return null;
  return (w / (h * h)).toFixed(1);
}

function classifyIMC(imc) {
  const v = parseFloat(imc);
  if (!v) return { label: '—', color: '#9CA3AF' };
  if (v < 18.5) return { label: 'Abaixo do peso', color: '#3B82F6' };
  if (v < 25)   return { label: 'Peso normal', color: '#10B981' };
  if (v < 30)   return { label: 'Sobrepeso', color: '#F59E0B' };
  if (v < 35)   return { label: 'Obesidade I', color: '#F97316' };
  if (v < 40)   return { label: 'Obesidade II', color: '#EF4444' };
  return { label: 'Obesidade III', color: '#7F1D1D' };
}

function calcVO2(cooper) {
  const d = parseFloat(cooper);
  if (!d) return null;
  return ((d - 504.9) / 44.73).toFixed(1);
}

function classifyVO2(vo2, gender) {
  const v = parseFloat(vo2);
  if (!v) return { label: '—', color: '#9CA3AF' };
  const isFemale = gender === 'F';
  if (isFemale) {
    if (v < 28) return { label: 'Fraco', color: '#EF4444' };
    if (v < 34) return { label: 'Regular', color: '#F97316' };
    if (v < 39) return { label: 'Bom', color: '#F59E0B' };
    if (v < 45) return { label: 'Muito bom', color: '#10B981' };
    return { label: 'Excelente', color: '#059669' };
  } else {
    if (v < 33) return { label: 'Fraco', color: '#EF4444' };
    if (v < 39) return { label: 'Regular', color: '#F97316' };
    if (v < 45) return { label: 'Bom', color: '#F59E0B' };
    if (v < 52) return { label: 'Muito bom', color: '#10B981' };
    return { label: 'Excelente', color: '#059669' };
  }
}

// ─── Seção colapsável ──────────────────────────────────────────
function Section({ title, icon: Icon, color, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: 'var(--bg-surface)', borderRadius: 16, marginBottom: 16, border: '1px solid var(--border-light)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} color={color} />
        </div>
        <span style={{ flex: 1, fontSize: 16, fontWeight: 800, color: 'var(--gray-900)' }}>{title}</span>
        <ChevronDown size={18} color="#9CA3AF" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Campo de formulário ──────────────────────────────────────
function Field({ label, value, onChange, placeholder, type = 'text', unit, readOnly }) {
  return (
    <div>
      <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type={type}
          value={value}
          onChange={onChange ? e => onChange(e.target.value) : undefined}
          placeholder={placeholder || '—'}
          readOnly={readOnly}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)',
            fontSize: 15, fontWeight: 600, color: readOnly ? '#6B7280' : '#111827',
            background: readOnly ? '#F9FAFB' : 'white', outline: 'none', boxSizing: 'border-box',
            paddingRight: unit ? 44 : 14,
          }}
        />
        {unit && (
          <span style={{ position: 'absolute', right: 12, fontSize: 12, fontWeight: 700, color: '#9CA3AF', pointerEvents: 'none' }}>{unit}</span>
        )}
      </div>
    </div>
  );
}

// ─── Badge de classificação ────────────────────────────────────
function ClassBadge({ label, color }) {
  if (!label || label === '—') return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 20, background: color + '18', color, fontSize: 12, fontWeight: 700 }}>
      {label}
    </span>
  );
}

// ─── Componente principal ──────────────────────────────────────
const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  gender: 'M',
  weight: '',
  height: '',
  age: '',
  bodyFat: '',
  // Circunferências (cm)
  waist: '', hip: '', chest: '', armRight: '', armLeft: '',
  thighRight: '', thighLeft: '', calf: '',
  // Testes físicos
  cooperDistance: '',      // metros em 12 min
  bench1rm: '',            // carga max supino
  squat1rm: '',            // carga max agachamento
  deadlift1rm: '',         // carga max terra
  pushups: '',             // nº de flexões
  situps: '',              // nº de abdominais em 1 min
  sitReach: '',            // flexibilidade (cm)
  // Postura (array de problemas marcados)
  posturalIssues: [],
  // Observações
  obs: '',
  recommendation: '',
};

const POSTURAL_OPTIONS = [
  'Cabeça projetada à frente',
  'Ombros elevados / protração',
  'Hiperlordose lombar',
  'Hipercifose torácica',
  'Escoliose aparente',
  'Anteversão pélvica',
  'Retroversão pélvica',
  'Joelhos valgos (para dentro)',
  'Joelhos varos (para fora)',
  'Pé plano',
  'Pé cavo',
  'Rotação externa de quadril',
];

export default function AvaliacaoFisica() {
  const { id: studentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const togglePostural = (v) => setForm(f => ({
    ...f,
    posturalIssues: f.posturalIssues.includes(v) ? f.posturalIssues.filter(x => x !== v) : [...f.posturalIssues, v],
  }));

  // Cálculos derivados
  const imc = calcIMC(form.weight, form.height);
  const imcClass = classifyIMC(imc);
  const vo2 = calcVO2(form.cooperDistance);
  const vo2Class = classifyVO2(vo2, form.gender);
  const leanMass = form.weight && form.bodyFat
    ? (parseFloat(form.weight) * (1 - parseFloat(form.bodyFat) / 100)).toFixed(1)
    : null;
  const fatMass = form.weight && form.bodyFat
    ? (parseFloat(form.weight) * parseFloat(form.bodyFat) / 100).toFixed(1)
    : null;

  useEffect(() => {
    if (!studentId) return;
    const load = async () => {
      if (hasSupabase) {
        const { data: s } = await supabase
          .from('students').select('id, name, email, phone').eq('id', studentId).maybeSingle();
        if (s) setStudent(s);

        const { data: assessments } = await supabase
          .from('physical_assessments')
          .select('*')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false });

        if (assessments?.length) {
          setHistory(assessments);
          // Load most recent
          const latest = assessments[0];
          setForm(f => ({ ...EMPTY_FORM, ...latest.data, date: latest.date || EMPTY_FORM.date }));
        }
      }
      setLoading(false);
    };
    load();
  }, [studentId]);

  const save = async () => {
    setSaving(true);
    try {
      const record = {
        student_id: studentId,
        personal_id: user.id,
        date: form.date,
        data: form,
      };
      if (hasSupabase) {
        const { data, error } = await supabase
          .from('physical_assessments')
          .insert(record)
          .select()
          .single();
        if (!error && data) {
          setHistory(prev => [data, ...prev]);
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const primaryColor = [59, 130, 246];
    const darkColor = [17, 24, 39];

    // Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('WAY FIT — Avaliação Física', 14, 20);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Aluno: ${student?.name || '—'}   |   Data: ${form.date}   |   Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 32);

    let y = 52;
    doc.setTextColor(...darkColor);

    const section = (title) => {
      doc.setFillColor(240, 249, 255);
      doc.rect(14, y - 4, 182, 10, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text(title, 16, y + 3);
      doc.setTextColor(...darkColor);
      y += 14;
    };

    const row = (label, value, extra) => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, 16, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value || '—', 70, y);
      if (extra) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text(extra, 140, y);
        doc.setTextColor(...darkColor);
      }
      y += 7;
    };

    // Dados básicos
    section('Dados Básicos');
    row('Nome', student?.name);
    row('Data da avaliação', form.date);
    row('Gênero', form.gender === 'M' ? 'Masculino' : 'Feminino');
    row('Idade', form.age ? `${form.age} anos` : '');
    row('Peso', form.weight ? `${form.weight} kg` : '');
    row('Altura', form.height ? `${form.height} cm` : '');
    row('IMC', imc ? `${imc} kg/m²` : '', imc ? imcClass.label : '');
    y += 4;

    // Composição corporal
    if (form.bodyFat || form.waist || form.hip) {
      section('Composição Corporal');
      row('Gordura corporal', form.bodyFat ? `${form.bodyFat}%` : '');
      if (leanMass) row('Massa magra', `${leanMass} kg`);
      if (fatMass) row('Massa gorda', `${fatMass} kg`);
      if (form.waist) row('Circunferência cintura', `${form.waist} cm`);
      if (form.hip) row('Circunferência quadril', `${form.hip} cm`);
      if (form.chest) row('Circunferência peitoral', `${form.chest} cm`);
      if (form.armRight) row('Braço direito', `${form.armRight} cm`);
      if (form.armLeft) row('Braço esquerdo', `${form.armLeft} cm`);
      if (form.thighRight) row('Coxa direita', `${form.thighRight} cm`);
      y += 4;
    }

    // Testes físicos
    if (form.cooperDistance || form.bench1rm || form.pushups) {
      section('Testes Físicos');
      if (form.cooperDistance) row('Teste de Cooper (12 min)', `${form.cooperDistance} m`, vo2 ? `VO₂ max: ${vo2} ml/kg/min (${vo2Class.label})` : '');
      if (form.bench1rm) row('1RM Supino', `${form.bench1rm} kg`);
      if (form.squat1rm) row('1RM Agachamento', `${form.squat1rm} kg`);
      if (form.deadlift1rm) row('1RM Levantamento Terra', `${form.deadlift1rm} kg`);
      if (form.pushups) row('Flexões de braço', `${form.pushups} rep`);
      if (form.situps) row('Abdominais (1 min)', `${form.situps} rep`);
      if (form.sitReach) row('Flexibilidade (sentar e alcançar)', `${form.sitReach} cm`);
      y += 4;
    }

    // Análise postural
    if (form.posturalIssues?.length) {
      section('Análise Postural');
      form.posturalIssues.forEach(issue => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`• ${issue}`, 18, y);
        y += 7;
      });
      y += 4;
    }

    // Observações
    if (form.obs || form.recommendation) {
      section('Observações e Recomendações');
      if (form.obs) {
        const obsLines = doc.splitTextToSize(form.obs, 175);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        obsLines.forEach(line => { doc.text(line, 16, y); y += 6; });
      }
      if (form.recommendation) {
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.text('Recomendações:', 16, y); y += 7;
        doc.setFont('helvetica', 'normal');
        const recLines = doc.splitTextToSize(form.recommendation, 175);
        recLines.forEach(line => { doc.text(line, 16, y); y += 6; });
      }
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(`WAY FIT • Gerado em ${new Date().toLocaleString('pt-BR')} • Página ${i}/${pageCount}`, 14, 290);
    }

    doc.save(`avaliacao-${student?.name?.replace(' ', '_') || 'aluno'}-${form.date}.pdf`);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <Loader size={28} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="page-padding" style={{ flex: 1, maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <button onClick={() => navigate(`/dashboard/alunos/${studentId}`)}
          style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-surface)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
          <ArrowLeft size={18} color="#374151" />
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--gray-900)' }}>Avaliação Física</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#9CA3AF' }}>
            {student?.name || 'Aluno'} · {history.length > 0 ? `${history.length} avaliação(ões) anterior(es)` : 'Primeira avaliação'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={generatePDF}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'var(--bg-surface)', border: '1.5px solid var(--border)', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--gray-700)' }}>
            <FileText size={16} color="#374151" /> Exportar PDF
          </button>
          <button onClick={save} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: saved ? '#10B981' : 'var(--accent)', border: 'none', borderRadius: 12, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, color: 'white' }}>
            {saving ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <Check size={16} /> : <Save size={16} />}
            {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Histórico rápido */}
      {history.length > 1 && (
        <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: '16px 20px', marginBottom: 16, border: '1px solid var(--border-light)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Avaliações anteriores</p>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {history.map((h, i) => (
              <button key={h.id} onClick={() => setForm({ ...EMPTY_FORM, ...h.data, date: h.date })}
                style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: i === 0 ? '#EFF6FF' : 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: i === 0 ? '#1D4ED8' : '#6B7280', whiteSpace: 'nowrap' }}>
                {h.date} {i === 0 ? '(atual)' : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Comparativo de avaliações */}
      {history.length >= 2 && (() => {
        const curr = history[0].data;
        const prev = history[1].data;
        const metrics = [
          { key: 'weight',    label: 'Peso',        unit: 'kg', better: 'lower' },
          { key: 'bodyFat',   label: '% Gordura',   unit: '%',  better: 'lower' },
          { key: 'waist',     label: 'Cintura',     unit: 'cm', better: 'lower' },
          { key: 'hip',       label: 'Quadril',     unit: 'cm', better: null },
          { key: 'chest',     label: 'Peitoral',    unit: 'cm', better: 'higher' },
          { key: 'armRight',  label: 'Braço',       unit: 'cm', better: 'higher' },
          { key: 'thighRight',label: 'Coxa',        unit: 'cm', better: 'higher' },
          { key: 'bench1rm',  label: 'Supino',      unit: 'kg', better: 'higher' },
          { key: 'squat1rm',  label: 'Agachamento', unit: 'kg', better: 'higher' },
        ];
        const deltas = metrics.map(m => {
          const c = parseFloat(curr?.[m.key]);
          const p = parseFloat(prev?.[m.key]);
          if (!c || !p) return null;
          const diff = c - p;
          const improved = m.better === null ? null : m.better === 'lower' ? diff < 0 : diff > 0;
          return { ...m, curr: c, prev: p, diff, improved };
        }).filter(Boolean);
        if (!deltas.length) return null;
        return (
          <div style={{ background: 'linear-gradient(135deg,#EFF6FF,#F5F3FF)', borderRadius: 16, padding: '16px 20px', marginBottom: 16, border: '1px solid #DBEAFE' }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Evolução: {history[1].date} → {history[0].date}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 8 }}>
              {deltas.map(d => {
                const color = d.improved === null ? '#6B7280' : d.improved ? '#10B981' : '#EF4444';
                const bg    = d.improved === null ? '#F9FAFB' : d.improved ? '#F0FDF4' : '#FEF2F2';
                const arrow = d.diff === 0 ? '—' : d.diff > 0 ? '↑' : '↓';
                const sign  = d.diff > 0 ? '+' : '';
                return (
                  <div key={d.key} style={{ background: bg, borderRadius: 12, padding: '10px 12px', border: `1px solid ${color}40` }}>
                    <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d.label}</p>
                    <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 900, color: 'var(--gray-900)' }}>{d.curr} <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF' }}>{d.unit}</span></p>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color }}>
                      {arrow} {d.diff !== 0 ? `${sign}${Math.abs(d.diff).toFixed(1)} ${d.unit}` : 'Igual'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 1. Dados Básicos */}
      <Section title="Dados Básicos" icon={Scale} color="#3B82F6">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
          <Field label="Data da avaliação" value={form.date} onChange={v => set('date', v)} type="date" />
          <div>
            <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gênero</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['M', 'Masculino'], ['F', 'Feminino']].map(([val, label]) => (
                <button key={val} onClick={() => set('gender', val)}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${form.gender === val ? '#3B82F6' : '#E5E7EB'}`, background: form.gender === val ? '#EFF6FF' : 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: form.gender === val ? '#1D4ED8' : '#6B7280' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Field label="Peso" value={form.weight} onChange={v => set('weight', v)} placeholder="70" type="number" unit="kg" />
          <Field label="Altura" value={form.height} onChange={v => set('height', v)} placeholder="175" type="number" unit="cm" />
          <Field label="Idade" value={form.age} onChange={v => set('age', v)} placeholder="30" type="number" unit="anos" />
          <div>
            <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>IMC calculado</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#F9FAFB', border: '1.5px solid var(--border)', minHeight: 44 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: imc ? imcClass.color : '#9CA3AF' }}>{imc || '—'}</span>
              {imc && <ClassBadge label={imcClass.label} color={imcClass.color} />}
            </div>
          </div>
        </div>
      </Section>

      {/* 2. Composição Corporal */}
      <Section title="Composição Corporal" icon={Activity} color="#8B5CF6">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
          <Field label="% Gordura corporal" value={form.bodyFat} onChange={v => set('bodyFat', v)} placeholder="20" type="number" unit="%" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Massa magra</p>
              <div style={{ padding: '10px 14px', borderRadius: 10, background: '#F9FAFB', border: '1.5px solid var(--border)', fontSize: 15, fontWeight: 700, color: leanMass ? '#10B981' : '#9CA3AF' }}>
                {leanMass ? `${leanMass} kg` : '—'}
              </div>
            </div>
            <div>
              <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Massa gorda</p>
              <div style={{ padding: '10px 14px', borderRadius: 10, background: '#F9FAFB', border: '1.5px solid var(--border)', fontSize: 15, fontWeight: 700, color: fatMass ? '#F59E0B' : '#9CA3AF' }}>
                {fatMass ? `${fatMass} kg` : '—'}
              </div>
            </div>
          </div>
        </div>
        <p style={{ margin: '18px 0 10px', fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Circunferências (cm)</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Cintura" value={form.waist} onChange={v => set('waist', v)} placeholder="80" type="number" unit="cm" />
          <Field label="Quadril" value={form.hip} onChange={v => set('hip', v)} placeholder="95" type="number" unit="cm" />
          <Field label="Peitoral" value={form.chest} onChange={v => set('chest', v)} placeholder="100" type="number" unit="cm" />
          <Field label="Braço direito" value={form.armRight} onChange={v => set('armRight', v)} placeholder="35" type="number" unit="cm" />
          <Field label="Braço esquerdo" value={form.armLeft} onChange={v => set('armLeft', v)} placeholder="34" type="number" unit="cm" />
          <Field label="Coxa direita" value={form.thighRight} onChange={v => set('thighRight', v)} placeholder="55" type="number" unit="cm" />
          <Field label="Coxa esquerda" value={form.thighLeft} onChange={v => set('thighLeft', v)} placeholder="54" type="number" unit="cm" />
          <Field label="Panturrilha" value={form.calf} onChange={v => set('calf', v)} placeholder="38" type="number" unit="cm" />
        </div>
      </Section>

      {/* 3. Testes Físicos */}
      <Section title="Testes Físicos" icon={Dumbbell} color="#10B981">
        {/* Cardio */}
        <p style={{ margin: '16px 0 10px', fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Resistência cardiovascular</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <Field label="Teste de Cooper (12 min)" value={form.cooperDistance} onChange={v => set('cooperDistance', v)} placeholder="2400" type="number" unit="m" />
            <p style={{ margin: '5px 0 0', fontSize: 11, color: '#9CA3AF' }}>Distância percorrida em 12 minutos correndo</p>
          </div>
          <div>
            <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>VO₂ máx estimado</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#F9FAFB', border: '1.5px solid var(--border)', minHeight: 44 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: vo2 ? vo2Class.color : '#9CA3AF' }}>
                {vo2 ? `${vo2} ml/kg/min` : '—'}
              </span>
              {vo2 && <ClassBadge label={vo2Class.label} color={vo2Class.color} />}
            </div>
          </div>
        </div>

        {/* Força */}
        <p style={{ margin: '18px 0 10px', fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Força (1RM estimado)</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="Supino reto" value={form.bench1rm} onChange={v => set('bench1rm', v)} placeholder="80" type="number" unit="kg" />
          <Field label="Agachamento" value={form.squat1rm} onChange={v => set('squat1rm', v)} placeholder="100" type="number" unit="kg" />
          <Field label="Levant. terra" value={form.deadlift1rm} onChange={v => set('deadlift1rm', v)} placeholder="120" type="number" unit="kg" />
        </div>

        {/* Resistência muscular e flexibilidade */}
        <p style={{ margin: '18px 0 10px', fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Resistência muscular e flexibilidade</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <Field label="Flexões de braço" value={form.pushups} onChange={v => set('pushups', v)} placeholder="20" type="number" unit="rep" />
          </div>
          <div>
            <Field label="Abdominais (1 min)" value={form.situps} onChange={v => set('situps', v)} placeholder="30" type="number" unit="rep" />
          </div>
          <div>
            <Field label="Sentar e alcançar" value={form.sitReach} onChange={v => set('sitReach', v)} placeholder="30" type="number" unit="cm" />
            <p style={{ margin: '4px 0 0', fontSize: 10, color: '#9CA3AF' }}>Banco de Wells</p>
          </div>
        </div>
      </Section>

      {/* 4. Análise Postural */}
      <Section title="Análise Postural" icon={TrendingUp} color="#F59E0B" defaultOpen={false}>
        <p style={{ margin: '14px 0 12px', fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>
          Marque os desvios posturais observados durante a avaliação:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {POSTURAL_OPTIONS.map(option => {
            const checked = form.posturalIssues.includes(option);
            return (
              <button key={option} onClick={() => togglePostural(option)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, border: `2px solid ${checked ? '#F59E0B' : '#E5E7EB'}`, background: checked ? '#FFFBEB' : 'white', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${checked ? '#F59E0B' : '#D1D5DB'}`, background: checked ? '#F59E0B' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {checked && <Check size={12} color="white" strokeWidth={3} />}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: checked ? '#92400E' : '#374151', lineHeight: 1.3 }}>{option}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* 5. Observações */}
      <Section title="Observações e Recomendações" icon={Ruler} color="#6B7280" defaultOpen={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Observações gerais</p>
            <textarea value={form.obs} onChange={e => set('obs', e.target.value)}
              placeholder="Anotações livres sobre a avaliação, comportamento do aluno, pontos de atenção..."
              rows={4}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', fontSize: 14, color: 'var(--gray-700)', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recomendações do personal</p>
            <textarea value={form.recommendation} onChange={e => set('recommendation', e.target.value)}
              placeholder="Estratégias, objetivos de curto/longo prazo, foco de cada fase do treinamento..."
              rows={4}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', fontSize: 14, color: 'var(--gray-700)', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
        </div>
      </Section>

      {/* Botão salvar final */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginBottom: 40 }}>
        <button onClick={generatePDF}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', background: 'var(--bg-surface)', border: '1.5px solid var(--border)', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--gray-700)' }}>
          <FileText size={16} /> Exportar PDF
        </button>
        <button onClick={save} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: saved ? '#10B981' : 'var(--accent)', border: 'none', borderRadius: 12, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, color: 'white', boxShadow: '0 4px 14px rgba(59,130,246,0.3)' }}>
          {saving ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <Check size={16} /> : <Save size={16} />}
          {saving ? 'Salvando...' : saved ? 'Avaliação salva!' : 'Salvar avaliação'}
        </button>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}


