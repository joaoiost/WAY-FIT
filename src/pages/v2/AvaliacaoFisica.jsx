import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, FileText, ChevronDown, Check, Scale, Activity, Dumbbell, Ruler, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { todayLocal } from '../../lib/date';
import { useScopedLoader } from '../../hooks/useScopedLoader';

function calcIMC(weight, height) {
  const h = parseFloat(height) / 100;
  const w = parseFloat(weight);
  if (!h || !w) return null;
  return (w / (h * h)).toFixed(1);
}
function classifyIMC(imc) {
  const v = parseFloat(imc);
  if (!v) return { label: '—', color: '#94A3B8' };
  if (v < 18.5) return { label: 'Abaixo do peso', color: '#2563EB' };
  if (v < 25) return { label: 'Peso normal', color: '#059669' };
  if (v < 30) return { label: 'Sobrepeso', color: '#D97706' };
  if (v < 35) return { label: 'Obesidade I', color: '#EA580C' };
  if (v < 40) return { label: 'Obesidade II', color: '#DC2626' };
  return { label: 'Obesidade III', color: '#991B1B' };
}
function calcVO2(cooper) {
  const d = parseFloat(cooper);
  if (!d) return null;
  return ((d - 504.9) / 44.73).toFixed(1);
}
function classifyVO2(vo2, gender) {
  const v = parseFloat(vo2);
  if (!v) return { label: '—', color: '#94A3B8' };
  const t = gender === 'F' ? [28, 34, 39, 45] : [33, 39, 45, 52];
  const labels = ['Fraco', 'Regular', 'Bom', 'Muito bom', 'Excelente'];
  const colors = ['#DC2626', '#EA580C', '#D97706', '#059669', '#047857'];
  const idx = t.findIndex(x => v < x);
  const i = idx === -1 ? 4 : idx;
  return { label: labels[i], color: colors[i] };
}

const EMPTY_FORM = {
  date: todayLocal(), gender: 'M', weight: '', height: '', age: '', bodyFat: '',
  waist: '', hip: '', chest: '', armRight: '', armLeft: '', thighRight: '', thighLeft: '', calf: '',
  cooperDistance: '', bench1rm: '', squat1rm: '', deadlift1rm: '', pushups: '', situps: '', sitReach: '',
  posturalIssues: [], obs: '', recommendation: '',
};

const POSTURAL_OPTIONS = [
  'Cabeça projetada à frente', 'Ombros elevados / protração', 'Hiperlordose lombar', 'Hipercifose torácica',
  'Escoliose aparente', 'Anteversão pélvica', 'Retroversão pélvica', 'Joelhos valgos (para dentro)',
  'Joelhos varos (para fora)', 'Pé plano', 'Pé cavo', 'Rotação externa de quadril',
];

const draftKey = (studentId) => `wayfit_avaliacao_draft_${studentId}`;

function Section({ title, icon: Icon, color, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-ink-100 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '18', color }}>
          <Icon size={17} />
        </div>
        <span className="flex-1 text-[14.5px] font-bold text-ink-900">{title}</span>
        <ChevronDown size={16} className="text-ink-300 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && <div className="px-4 pb-4 border-t border-ink-100 pt-4">{children}</div>}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', unit }) {
  return (
    <div>
      <label className="block text-[10.5px] font-bold uppercase tracking-wide text-ink-400 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg border border-ink-200 text-[14px] font-medium text-ink-900 outline-none focus:border-brand-500"
          style={{ paddingRight: unit ? 40 : 12 }}
        />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-ink-400 pointer-events-none">{unit}</span>}
      </div>
    </div>
  );
}

function ReadBox({ label, value, color }) {
  return (
    <div>
      <label className="block text-[10.5px] font-bold uppercase tracking-wide text-ink-400 mb-1.5">{label}</label>
      <div className="flex items-center px-3 py-2 rounded-lg bg-ink-50 border border-ink-100 min-h-[38px]">
        <span className="text-[14.5px] font-bold" style={{ color: color || '#94A3B8' }}>{value || '—'}</span>
      </div>
    </div>
  );
}

async function loadAssessments(studentId) {
  const [{ data: s }, { data: assessments }] = await Promise.all([
    supabase.from('students').select('id, name, email, phone').eq('id', studentId).maybeSingle(),
    supabase.from('physical_assessments').select('*').eq('student_id', studentId).order('created_at', { ascending: false }),
  ]);
  return { student: s, history: assessments || [] };
}

export default function AvaliacaoFisicaV2() {
  const { id: studentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [draftBanner, setDraftBanner] = useState(false);
  const firstLoad = useRef(true);

  const { data, loading, setData } = useScopedLoader(studentId, loadAssessments);

  useEffect(() => {
    if (!data || !firstLoad.current) return;
    firstLoad.current = false;
    if (data.history.length) setForm(f => ({ ...EMPTY_FORM, ...data.history[0].data, date: data.history[0].date || EMPTY_FORM.date }));
    try {
      const draft = localStorage.getItem(draftKey(studentId));
      if (draft) setDraftBanner(true);
    } catch {}
  }, [data, studentId]);

  useEffect(() => {
    if (firstLoad.current) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(draftKey(studentId), JSON.stringify(form)); } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [form, studentId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const togglePostural = (v) => setForm(f => ({ ...f, posturalIssues: f.posturalIssues.includes(v) ? f.posturalIssues.filter(x => x !== v) : [...f.posturalIssues, v] }));

  const restoreDraft = () => {
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey(studentId)));
      if (draft) setForm(draft);
    } catch {}
    setDraftBanner(false);
  };
  const discardDraft = () => {
    try { localStorage.removeItem(draftKey(studentId)); } catch {}
    setDraftBanner(false);
  };

  const imc = calcIMC(form.weight, form.height);
  const imcClass = classifyIMC(imc);
  const vo2 = calcVO2(form.cooperDistance);
  const vo2Class = classifyVO2(vo2, form.gender);
  const leanMass = form.weight && form.bodyFat ? (parseFloat(form.weight) * (1 - parseFloat(form.bodyFat) / 100)).toFixed(1) : null;
  const fatMass = form.weight && form.bodyFat ? (parseFloat(form.weight) * parseFloat(form.bodyFat) / 100).toFixed(1) : null;

  const handleSave = async () => {
    setSaving(true);
    const record = { student_id: studentId, personal_id: user.id, date: form.date, data: form };
    const { data: saved, error } = await supabase.from('physical_assessments').insert(record).select().single();
    setSaving(false);
    if (error) { toast.error('Não foi possível salvar.'); return; }
    setData(prev => ({ ...prev, history: [saved, ...prev.history] }));
    try { localStorage.removeItem(draftKey(studentId)); } catch {}
    toast.success('Avaliação salva!');
  };

  const generatePDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const brand = [79, 70, 229], dark = [15, 23, 42];
    doc.setFillColor(...brand); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text('WAY FIT — Avaliação Física', 14, 20);
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text(`Aluno: ${data?.student?.name || '—'}   |   Data: ${form.date}`, 14, 32);
    let y = 52;
    doc.setTextColor(...dark);
    const section = (title) => {
      doc.setFillColor(238, 242, 255); doc.rect(14, y - 4, 182, 10, 'F');
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...brand);
      doc.text(title, 16, y + 3); doc.setTextColor(...dark); y += 14;
    };
    const row = (label, value, extra) => {
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(`${label}:`, 16, y);
      doc.setFont('helvetica', 'normal'); doc.text(value || '—', 70, y);
      if (extra) { doc.setFont('helvetica', 'bold'); doc.setTextColor(...brand); doc.text(extra, 140, y); doc.setTextColor(...dark); }
      y += 7;
    };
    section('Dados Básicos');
    row('Nome', data?.student?.name);
    row('Data da avaliação', form.date);
    row('Peso', form.weight ? `${form.weight} kg` : '');
    row('Altura', form.height ? `${form.height} cm` : '');
    row('IMC', imc ? `${imc} kg/m²` : '', imc ? imcClass.label : '');
    y += 4;
    if (form.bodyFat || form.waist) {
      section('Composição Corporal');
      if (form.bodyFat) row('Gordura corporal', `${form.bodyFat}%`);
      if (leanMass) row('Massa magra', `${leanMass} kg`);
      if (form.waist) row('Cintura', `${form.waist} cm`);
      y += 4;
    }
    if (form.cooperDistance || form.bench1rm) {
      section('Testes Físicos');
      if (form.cooperDistance) row('Cooper (12 min)', `${form.cooperDistance} m`, vo2 ? `VO₂: ${vo2} (${vo2Class.label})` : '');
      if (form.bench1rm) row('1RM Supino', `${form.bench1rm} kg`);
      if (form.squat1rm) row('1RM Agachamento', `${form.squat1rm} kg`);
      y += 4;
    }
    if (form.obs || form.recommendation) {
      section('Observações');
      if (form.obs) doc.splitTextToSize(form.obs, 175).forEach(l => { doc.setFontSize(10); doc.text(l, 16, y); y += 6; });
    }
    doc.save(`avaliacao-${data?.student?.name?.replace(' ', '_') || 'aluno'}-${form.date}.pdf`);
  };

  if (loading || !data) return <div className="py-24 text-center text-sm text-ink-400">Carregando...</div>;

  return (
    <div className="flex flex-col gap-4 max-w-3xl mx-auto">
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(`/v2/alunos/${studentId}`)} className="w-9 h-9 rounded-full border border-ink-200 flex items-center justify-center shrink-0 hover:bg-ink-50">
          <ArrowLeft size={16} className="text-ink-600" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-ink-900">Avaliação Física</h2>
          <p className="text-[13px] text-ink-500 mt-0.5">{data.student?.name || 'Aluno'} · {data.history.length > 0 ? `${data.history.length} avaliação(ões) anterior(es)` : 'Primeira avaliação'}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={generatePDF} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-ink-200 text-[12.5px] font-semibold text-ink-700 hover:bg-ink-50">
            <FileText size={14} /> PDF
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 text-white text-[12.5px] font-semibold hover:bg-brand-700 disabled:opacity-60">
            <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {draftBanner && (
        <div className="flex items-center gap-3 bg-warning-50 border border-warning-500/25 rounded-xl px-4 py-2.5">
          <p className="flex-1 text-[12.5px] text-ink-700">Encontramos uma edição não salva desta avaliação.</p>
          <button onClick={restoreDraft} className="text-[12px] font-bold text-brand-600">Restaurar</button>
          <button onClick={discardDraft} className="text-ink-400 hover:text-ink-600"><X size={14} /></button>
        </div>
      )}

      {data.history.length > 1 && (
        <div className="bg-white border border-ink-100 rounded-xl px-4 py-3.5">
          <p className="text-[10.5px] font-bold uppercase text-ink-400 mb-2">Avaliações anteriores</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {data.history.map((h, i) => (
              <button key={h.id} onClick={() => setForm({ ...EMPTY_FORM, ...h.data, date: h.date })}
                className={`shrink-0 px-3 py-1.5 rounded-lg border text-[12px] font-bold whitespace-nowrap ${i === 0 ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-ink-200 text-ink-500'}`}>
                {h.date} {i === 0 ? '(atual)' : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      <Section title="Dados básicos" icon={Scale} color="#2563EB">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data da avaliação" value={form.date} onChange={(v) => set('date', v)} type="date" />
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wide text-ink-400 mb-1.5">Gênero</label>
            <div className="flex gap-2">
              {[['M', 'Masculino'], ['F', 'Feminino']].map(([val, label]) => (
                <button key={val} onClick={() => set('gender', val)} className={`flex-1 py-2 rounded-lg text-[12.5px] font-bold border ${form.gender === val ? 'bg-brand-50 border-brand-500 text-brand-700' : 'bg-white border-ink-200 text-ink-500'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Field label="Peso" value={form.weight} onChange={(v) => set('weight', v)} placeholder="70" type="number" unit="kg" />
          <Field label="Altura" value={form.height} onChange={(v) => set('height', v)} placeholder="175" type="number" unit="cm" />
          <Field label="Idade" value={form.age} onChange={(v) => set('age', v)} placeholder="30" type="number" unit="anos" />
          <div>
            <ReadBox label="IMC calculado" value={imc ? `${imc} · ${imcClass.label}` : null} color={imc ? imcClass.color : null} />
            {imc && <p className="text-[10.5px] text-ink-400 mt-1">Considere junto ao % de gordura — IMC sozinho não diferencia massa muscular de gordura.</p>}
          </div>
        </div>
      </Section>

      <Section title="Composição corporal" icon={Activity} color="#7C3AED">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Field label="% Gordura corporal" value={form.bodyFat} onChange={(v) => set('bodyFat', v)} placeholder="20" type="number" unit="%" />
          <div className="grid grid-cols-2 gap-2">
            <ReadBox label="Massa magra" value={leanMass ? `${leanMass} kg` : null} color={leanMass ? '#059669' : null} />
            <ReadBox label="Massa gorda" value={fatMass ? `${fatMass} kg` : null} color={fatMass ? '#D97706' : null} />
          </div>
        </div>
        <p className="text-[11px] font-bold uppercase text-ink-400 mb-2">Circunferências (cm)</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cintura" value={form.waist} onChange={(v) => set('waist', v)} type="number" unit="cm" />
          <Field label="Quadril" value={form.hip} onChange={(v) => set('hip', v)} type="number" unit="cm" />
          <Field label="Peitoral" value={form.chest} onChange={(v) => set('chest', v)} type="number" unit="cm" />
          <Field label="Braço direito" value={form.armRight} onChange={(v) => set('armRight', v)} type="number" unit="cm" />
          <Field label="Braço esquerdo" value={form.armLeft} onChange={(v) => set('armLeft', v)} type="number" unit="cm" />
          <Field label="Coxa direita" value={form.thighRight} onChange={(v) => set('thighRight', v)} type="number" unit="cm" />
          <Field label="Coxa esquerda" value={form.thighLeft} onChange={(v) => set('thighLeft', v)} type="number" unit="cm" />
          <Field label="Panturrilha" value={form.calf} onChange={(v) => set('calf', v)} type="number" unit="cm" />
        </div>
      </Section>

      <Section title="Testes físicos" icon={Dumbbell} color="#059669">
        <p className="text-[11px] font-bold uppercase text-ink-400 mb-2">Resistência cardiovascular</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Field label="Teste de Cooper (12 min)" value={form.cooperDistance} onChange={(v) => set('cooperDistance', v)} placeholder="2400" type="number" unit="m" />
          <ReadBox label="VO₂ máx estimado" value={vo2 ? `${vo2} · ${vo2Class.label}` : null} color={vo2 ? vo2Class.color : null} />
        </div>
        <p className="text-[11px] font-bold uppercase text-ink-400 mb-2">Força (1RM estimado)</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Field label="Supino reto" value={form.bench1rm} onChange={(v) => set('bench1rm', v)} type="number" unit="kg" />
          <Field label="Agachamento" value={form.squat1rm} onChange={(v) => set('squat1rm', v)} type="number" unit="kg" />
          <Field label="Levant. terra" value={form.deadlift1rm} onChange={(v) => set('deadlift1rm', v)} type="number" unit="kg" />
        </div>
        <p className="text-[11px] font-bold uppercase text-ink-400 mb-2">Resistência muscular e flexibilidade</p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Flexões de braço" value={form.pushups} onChange={(v) => set('pushups', v)} type="number" unit="rep" />
          <Field label="Abdominais (1 min)" value={form.situps} onChange={(v) => set('situps', v)} type="number" unit="rep" />
          <Field label="Sentar e alcançar" value={form.sitReach} onChange={(v) => set('sitReach', v)} type="number" unit="cm" />
        </div>
      </Section>

      <Section title="Análise postural" icon={Ruler} color="#D97706" defaultOpen={false}>
        <p className="text-[13px] text-ink-500 mb-3">Marque os desvios posturais observados durante a avaliação:</p>
        <div className="grid grid-cols-2 gap-2">
          {POSTURAL_OPTIONS.map(option => {
            const checked = form.posturalIssues.includes(option);
            return (
              <button key={option} onClick={() => togglePostural(option)} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left ${checked ? 'bg-warning-50 border-warning-500' : 'bg-white border-ink-200'}`}>
                <div className={`w-4.5 h-4.5 rounded flex items-center justify-center shrink-0 ${checked ? 'bg-warning-500' : 'border border-ink-300'}`} style={{ width: 18, height: 18 }}>
                  {checked && <Check size={11} className="text-white" strokeWidth={3} />}
                </div>
                <span className="text-[12.5px] font-medium text-ink-700 leading-tight">{option}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Observações e recomendações" icon={Ruler} color="#64748B" defaultOpen={false}>
        <div className="flex flex-col gap-3.5">
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wide text-ink-400 mb-1.5">Observações gerais</label>
            <textarea rows={3} value={form.obs} onChange={(e) => set('obs', e.target.value)} placeholder="Anotações livres sobre a avaliação..." className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wide text-ink-400 mb-1.5">Recomendações do personal</label>
            <textarea rows={3} value={form.recommendation} onChange={(e) => set('recommendation', e.target.value)} placeholder="Estratégias, objetivos, foco de cada fase..." className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none focus:border-brand-500" />
          </div>
        </div>
      </Section>

      <div className="flex justify-end gap-2.5 pb-8">
        <button onClick={generatePDF} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-ink-200 text-[13px] font-semibold text-ink-700 hover:bg-ink-50">
          <FileText size={15} /> Exportar PDF
        </button>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-brand-600 text-white text-[13px] font-semibold hover:bg-brand-700 disabled:opacity-60">
          <Save size={15} /> {saving ? 'Salvando...' : 'Salvar avaliação'}
        </button>
      </div>
    </div>
  );
}
