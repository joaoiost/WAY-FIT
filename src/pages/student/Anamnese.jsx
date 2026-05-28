import { useState, useEffect } from 'react';
import { Save, CheckCircle, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const EMPTY = {
  fullName: '', birthDate: '', height: '', weightInitial: '',
  phone: '', emergency: '',
  diseases: [], otherDisease: '', medications: '', surgeries: '', allergies: '',
  injuries: [], injuryDetails: '', limitations: '',
  goal: 'Hipertrofia', goalDetail: '', deadline: '6 meses', activityLevel: 'moderado',
  sleepHours: '7', stressLevel: '5', smokeDrink: 'nao', diet: '', workHours: '8', waterLiters: '2',
};

const DISEASES = ['Hipertensão', 'Diabetes', 'Cardiopatia', 'Artrite', 'Osteoporose', 'Asma', 'Obesidade', 'Colesterol alto'];
const INJURIES = ['Coluna lombar', 'Coluna cervical', 'Joelho esquerdo', 'Joelho direito', 'Ombro esquerdo', 'Ombro direito', 'Tornozelo', 'Quadril'];
const SECTIONS = [
  { id: 'basics', label: 'Dados Pessoais', icon: '👤' },
  { id: 'health', label: 'Saúde', icon: '❤️' },
  { id: 'injuries', label: 'Lesões', icon: '🩹' },
  { id: 'goals', label: 'Objetivos', icon: '🎯' },
  { id: 'lifestyle', label: 'Estilo de Vida', icon: '🌿' },
];

export default function Anamnese() {
  const { user } = useAuth();
  const [studentId, setStudentId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('basics');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      if (!hasSupabase) {
        try { const stored = JSON.parse(localStorage.getItem('wayfit_anamnese')); if (stored) setForm(stored); }
        catch {}
        setLoading(false);
        return;
      }

      const { data: student } = await supabase
        .from('students').select('id, name, phone').eq('user_id', user.id).maybeSingle();

      if (student) {
        setStudentId(student.id);
        const { data } = await supabase
          .from('anamneses').select('data').eq('student_id', student.id).maybeSingle();

        if (data?.data) {
          setForm({ ...EMPTY, ...data.data });
        } else {
          // Pré-preenche com dados já conhecidos
          setForm(f => ({ ...f, fullName: user.name || '', phone: student.phone || '' }));
        }
      }
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleArr = (k, v) => setForm(f => ({ ...f, [k]: f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v] }));

  const save = async () => {
    setSaving(true);
    if (hasSupabase && studentId) {
      await supabase.from('anamneses').upsert(
        { student_id: studentId, data: form, updated_at: new Date().toISOString() },
        { onConflict: 'student_id' }
      );
    } else {
      localStorage.setItem('wayfit_anamnese', JSON.stringify(form));
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const Field = ({ label, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label>{label}</label>
      {children}
    </div>
  );

  const CheckGroup = ({ items, field, cols = 2 }) => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
      {items.map(item => (
        <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: `1px solid ${form[field].includes(item) ? '#3B82F6' : '#E5E7EB'}`, cursor: 'pointer', background: form[field].includes(item) ? '#EFF6FF' : 'white', transition: 'all 0.15s', margin: 0, fontWeight: 400, fontSize: 13 }}>
          <input type="checkbox" checked={form[field].includes(item)} onChange={() => toggleArr(field, item)} style={{ width: 'auto', padding: 0, border: 'none', boxShadow: 'none', accentColor: '#3B82F6' }} />
          {item}
        </label>
      ))}
    </div>
  );

  const sections = {
    basics: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Nome completo"><input value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Seu nome completo" /></Field>
          <Field label="Data de nascimento"><input type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} /></Field>
          <Field label="Altura (cm)"><input type="number" value={form.height} onChange={e => set('height', e.target.value)} placeholder="170" /></Field>
          <Field label="Peso inicial (kg)"><input type="number" step="0.1" value={form.weightInitial} onChange={e => set('weightInitial', e.target.value)} placeholder="70" /></Field>
          <Field label="Telefone"><input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" /></Field>
          <Field label="Contato de emergência"><input value={form.emergency} onChange={e => set('emergency', e.target.value)} placeholder="Nome - Telefone" /></Field>
        </div>
      </div>
    ),
    health: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Doenças pré-existentes">
          <CheckGroup items={DISEASES} field="diseases" cols={2} />
        </Field>
        <Field label="Outras doenças"><input value={form.otherDisease} onChange={e => set('otherDisease', e.target.value)} placeholder="Descreva se houver..." /></Field>
        <Field label="Medicamentos em uso"><textarea value={form.medications} onChange={e => set('medications', e.target.value)} placeholder="Nome dos medicamentos e dosagem..." rows={2} /></Field>
        <Field label="Cirurgias anteriores"><input value={form.surgeries} onChange={e => set('surgeries', e.target.value)} placeholder="Tipo e data aproximada..." /></Field>
        <Field label="Alergias"><input value={form.allergies} onChange={e => set('allergies', e.target.value)} placeholder="Alimentos, medicamentos, outros..." /></Field>
      </div>
    ),
    injuries: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Lesões ou dores atuais/recentes">
          <CheckGroup items={INJURIES} field="injuries" cols={2} />
        </Field>
        <Field label="Detalhes das lesões"><textarea value={form.injuryDetails} onChange={e => set('injuryDetails', e.target.value)} placeholder="Tipo de lesão, quando aconteceu, tratamento..." rows={3} /></Field>
        <Field label="Limitações físicas"><textarea value={form.limitations} onChange={e => set('limitations', e.target.value)} placeholder="Movimentos ou exercícios que não consegue realizar..." rows={2} /></Field>
      </div>
    ),
    goals: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Objetivo principal">
          <select value={form.goal} onChange={e => set('goal', e.target.value)}>
            {['Hipertrofia', 'Emagrecimento', 'Condicionamento', 'Força', 'Resistência', 'Saúde geral', 'Reabilitação'].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Descreva seu objetivo com mais detalhes">
          <textarea value={form.goalDetail} onChange={e => set('goalDetail', e.target.value)} rows={3} placeholder="Quanto quer perder/ganhar, qual resultado espera..." />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Prazo desejado">
            <select value={form.deadline} onChange={e => set('deadline', e.target.value)}>
              {['1 mês', '3 meses', '6 meses', '1 ano', 'Longo prazo'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Nível de atividade atual">
            <select value={form.activityLevel} onChange={e => set('activityLevel', e.target.value)}>
              <option value="sedentario">Sedentário</option>
              <option value="leve">Levemente ativo</option>
              <option value="moderado">Moderadamente ativo</option>
              <option value="ativo">Muito ativo</option>
            </select>
          </Field>
        </div>
      </div>
    ),
    lifestyle: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Horas de sono por noite"><input type="number" min={1} max={12} value={form.sleepHours} onChange={e => set('sleepHours', e.target.value)} /></Field>
          <Field label={`Nível de estresse: ${form.stressLevel}/10`}>
            <input type="range" min={1} max={10} value={form.stressLevel} onChange={e => set('stressLevel', e.target.value)} style={{ padding: 0, border: 'none', boxShadow: 'none', height: 'auto', accentColor: '#3B82F6' }} />
          </Field>
          <Field label="Horas de trabalho/dia"><input type="number" value={form.workHours} onChange={e => set('workHours', e.target.value)} /></Field>
          <Field label="Litros de água/dia"><input type="number" step="0.5" value={form.waterLiters} onChange={e => set('waterLiters', e.target.value)} /></Field>
        </div>
        <Field label="Fuma ou consome álcool?">
          <select value={form.smokeDrink} onChange={e => set('smokeDrink', e.target.value)}>
            <option value="nao">Não</option>
            <option value="alcool">Só álcool socialmente</option>
            <option value="fumo">Só fumo</option>
            <option value="ambos">Ambos</option>
          </select>
        </Field>
        <Field label="Descreva sua alimentação atual">
          <textarea value={form.diet} onChange={e => set('diet', e.target.value)} rows={3} placeholder="Refeições diárias, restrições, dieta especial..." />
        </Field>
      </div>
    ),
  };

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
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Ficha de Saúde</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6B7280' }}>Visível apenas para o seu personal</p>
        </div>
        <button onClick={save} className="btn-primary" disabled={saving}>
          {saving ? <><Loader size={16} /> Salvando...</> : saved ? <><CheckCircle size={16} /> Salvo!</> : <><Save size={16} /> Salvar</>}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', background: activeSection === s.id ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)' : '#F3F4F6', color: activeSection === s.id ? 'white' : '#6B7280', transition: 'all 0.15s', flexShrink: 0 }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {sections[activeSection]}
      </div>

      {saved && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#111827', color: 'white', padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, zIndex: 1000 }}>
          <CheckCircle size={16} color="#10B981" /> Ficha de saúde salva!
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
