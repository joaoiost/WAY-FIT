import { useState, useEffect } from 'react';
import { Dumbbell, Loader, Save, Check, Plus, Play, Trash2, ChevronDown, ArrowLeft, X } from 'lucide-react';
import { trainingPlans as mockPlans, students as mockStudents } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const DAYS = [
  { value: 1, label: 'Seg', full: 'Segunda-feira' },
  { value: 2, label: 'Ter', full: 'Terça-feira' },
  { value: 3, label: 'Qua', full: 'Quarta-feira' },
  { value: 4, label: 'Qui', full: 'Quinta-feira' },
  { value: 5, label: 'Sex', full: 'Sexta-feira' },
  { value: 6, label: 'Sáb', full: 'Sábado' },
  { value: 0, label: 'Dom', full: 'Domingo' },
];

const GROUPS = ['Peito','Costas','Pernas','Ombro','Braços','Abdômen','Full Body','Cardio','Descanso'];

const GROUP_COLORS = {
  Peito:'#EF4444',Costas:'#3B82F6',Pernas:'#8B5CF6',Ombro:'#F59E0B',
  Braços:'#10B981',Abdômen:'#06B6D4','Full Body':'#EC4899',Cardio:'#F97316',Descanso:'#9CA3AF',
};

const EXERCISE_DB = {
  Peito:[
    {name:'Supino Reto com Barra',sets:4,reps:'8-10',rest:'90s',video:'https://www.youtube.com/results?search_query=supino+reto+barra'},
    {name:'Supino Inclinado com Halteres',sets:3,reps:'10-12',rest:'75s',video:'https://www.youtube.com/results?search_query=supino+inclinado+halteres'},
    {name:'Supino Declinado com Barra',sets:3,reps:'10-12',rest:'75s',video:'https://www.youtube.com/results?search_query=supino+declinado+barra'},
    {name:'Supino com Halteres',sets:3,reps:'10-12',rest:'75s',video:'https://www.youtube.com/results?search_query=supino+halteres'},
    {name:'Crucifixo com Halteres',sets:3,reps:'12-15',rest:'60s',video:'https://www.youtube.com/results?search_query=crucifixo+halteres+peito'},
    {name:'Pec Deck (Voador)',sets:3,reps:'12-15',rest:'60s',video:'https://www.youtube.com/results?search_query=pec+deck+voador'},
    {name:'Crossover no Cabo',sets:3,reps:'12-15',rest:'60s',video:'https://www.youtube.com/results?search_query=crossover+cabo+peito'},
    {name:'Pullover com Haltere',sets:3,reps:'12-15',rest:'60s',video:'https://www.youtube.com/results?search_query=pullover+haltere'},
    {name:'Flexão de Braço',sets:3,reps:'15-20',rest:'60s',video:'https://www.youtube.com/results?search_query=flexão+de+braço'},
  ],
  Costas:[
    {name:'Puxada Frontal na Polia',sets:4,reps:'8-12',rest:'90s',video:'https://www.youtube.com/results?search_query=puxada+frontal+polia'},
    {name:'Remada Curvada com Barra',sets:4,reps:'8-10',rest:'90s',video:'https://www.youtube.com/results?search_query=remada+curvada+barra'},
    {name:'Remada Unilateral com Haltere',sets:3,reps:'10-12',rest:'75s',video:'https://www.youtube.com/results?search_query=remada+unilateral+haltere'},
    {name:'Remada Cavalinho (Serrote)',sets:3,reps:'10-12',rest:'75s',video:'https://www.youtube.com/results?search_query=remada+cavalinho+serrote'},
    {name:'Levantamento Terra',sets:3,reps:'6-8',rest:'120s',video:'https://www.youtube.com/results?search_query=levantamento+terra+deadlift'},
    {name:'Puxada com Triângulo',sets:3,reps:'10-12',rest:'75s',video:'https://www.youtube.com/results?search_query=puxada+triangulo+costas'},
    {name:'Pull-up (Barra Fixa)',sets:3,reps:'8-12',rest:'90s',video:'https://www.youtube.com/results?search_query=pull+up+barra+fixa'},
    {name:'Remada Sentado no Cabo',sets:3,reps:'12-15',rest:'60s',video:'https://www.youtube.com/results?search_query=remada+sentado+cabo'},
    {name:'Hiperextensão Lombar',sets:3,reps:'12-15',rest:'60s',video:'https://www.youtube.com/results?search_query=hiperextensão+lombar'},
  ],
  Pernas:[
    {name:'Agachamento Livre com Barra',sets:4,reps:'8-10',rest:'120s',video:'https://www.youtube.com/results?search_query=agachamento+livre+barra'},
    {name:'Leg Press 45°',sets:4,reps:'10-12',rest:'90s',video:'https://www.youtube.com/results?search_query=leg+press+45'},
    {name:'Extensora (Cadeira Extensora)',sets:3,reps:'12-15',rest:'60s',video:'https://www.youtube.com/results?search_query=extensora+cadeira+extensora'},
    {name:'Flexora (Mesa Flexora)',sets:3,reps:'12-15',rest:'60s',video:'https://www.youtube.com/results?search_query=mesa+flexora'},
    {name:'Stiff com Halteres',sets:3,reps:'10-12',rest:'75s',video:'https://www.youtube.com/results?search_query=stiff+halteres'},
    {name:'Afundo com Halteres',sets:3,reps:'12 cada',rest:'75s',video:'https://www.youtube.com/results?search_query=afundo+lunges+halteres'},
    {name:'Adutora na Máquina',sets:3,reps:'15-20',rest:'60s',video:'https://www.youtube.com/results?search_query=adutora+maquina'},
    {name:'Abdutora na Máquina',sets:3,reps:'15-20',rest:'60s',video:'https://www.youtube.com/results?search_query=abdutora+maquina'},
    {name:'Panturrilha em Pé',sets:4,reps:'15-20',rest:'60s',video:'https://www.youtube.com/results?search_query=panturrilha+em+pé'},
    {name:'Hack Squat na Máquina',sets:3,reps:'10-12',rest:'90s',video:'https://www.youtube.com/results?search_query=hack+squat+maquina'},
  ],
  Ombro:[
    {name:'Desenvolvimento com Halteres',sets:4,reps:'10-12',rest:'75s',video:'https://www.youtube.com/results?search_query=desenvolvimento+halteres+ombro'},
    {name:'Desenvolvimento Militar com Barra',sets:4,reps:'8-10',rest:'90s',video:'https://www.youtube.com/results?search_query=desenvolvimento+militar+barra'},
    {name:'Elevação Lateral com Halteres',sets:3,reps:'12-15',rest:'60s',video:'https://www.youtube.com/results?search_query=elevação+lateral+halteres'},
    {name:'Elevação Frontal com Halteres',sets:3,reps:'12-15',rest:'60s',video:'https://www.youtube.com/results?search_query=elevação+frontal+halteres'},
    {name:'Voador Invertido (Deltóide Posterior)',sets:3,reps:'12-15',rest:'60s',video:'https://www.youtube.com/results?search_query=voador+invertido+deltóide'},
    {name:'Encolhimento com Halteres',sets:3,reps:'12-15',rest:'60s',video:'https://www.youtube.com/results?search_query=encolhimento+halteres'},
    {name:'Remada Alta com Barra',sets:3,reps:'10-12',rest:'60s',video:'https://www.youtube.com/results?search_query=remada+alta+barra+ombro'},
  ],
  Braços:[
    {name:'Rosca Direta com Barra',sets:3,reps:'10-12',rest:'75s',video:'https://www.youtube.com/results?search_query=rosca+direta+barra'},
    {name:'Rosca Alternada com Halteres',sets:3,reps:'10-12',rest:'75s',video:'https://www.youtube.com/results?search_query=rosca+alternada+halteres'},
    {name:'Rosca Martelo com Halteres',sets:3,reps:'10-12',rest:'75s',video:'https://www.youtube.com/results?search_query=rosca+martelo+halteres'},
    {name:'Rosca Scott com Barra',sets:3,reps:'10-12',rest:'75s',video:'https://www.youtube.com/results?search_query=rosca+scott+barra'},
    {name:'Rosca Concentrada',sets:3,reps:'12-15',rest:'60s',video:'https://www.youtube.com/results?search_query=rosca+concentrada+bíceps'},
    {name:'Tríceps Pulley no Cabo',sets:3,reps:'12-15',rest:'60s',video:'https://www.youtube.com/results?search_query=tríceps+pulley+corda'},
    {name:'Tríceps Testa com Barra',sets:3,reps:'10-12',rest:'75s',video:'https://www.youtube.com/results?search_query=tríceps+testa+barra'},
    {name:'Tríceps Francês com Haltere',sets:3,reps:'10-12',rest:'75s',video:'https://www.youtube.com/results?search_query=tríceps+francês+haltere'},
    {name:'Tríceps Coice com Haltere',sets:3,reps:'12-15',rest:'60s',video:'https://www.youtube.com/results?search_query=tríceps+coice+haltere'},
    {name:'Mergulho no Banco (Tríceps)',sets:3,reps:'12-15',rest:'60s',video:'https://www.youtube.com/results?search_query=mergulho+banco+triceps'},
  ],
  Abdômen:[
    {name:'Crunch Abdominal',sets:3,reps:'20-25',rest:'45s',video:'https://www.youtube.com/results?search_query=crunch+abdominal'},
    {name:'Prancha Frontal',sets:3,reps:'45-60s',rest:'45s',video:'https://www.youtube.com/results?search_query=prancha+frontal+plank'},
    {name:'Elevação de Pernas',sets:3,reps:'15-20',rest:'45s',video:'https://www.youtube.com/results?search_query=elevação+de+pernas+abdominal'},
    {name:'Abdominal Oblíquo',sets:3,reps:'20 cada',rest:'45s',video:'https://www.youtube.com/results?search_query=abdominal+oblíquo'},
    {name:'Bicicleta Abdominal',sets:3,reps:'20-30',rest:'45s',video:'https://www.youtube.com/results?search_query=bicicleta+abdominal'},
    {name:'Russian Twist',sets:3,reps:'20-30',rest:'45s',video:'https://www.youtube.com/results?search_query=russian+twist+abdominal'},
    {name:'Abdominal na Máquina',sets:3,reps:'15-20',rest:'45s',video:'https://www.youtube.com/results?search_query=abdominal+máquina'},
  ],
  'Full Body':[
    {name:'Burpee',sets:3,reps:'10-15',rest:'60s',video:'https://www.youtube.com/results?search_query=burpee+como+fazer'},
    {name:'Agachamento com Salto',sets:3,reps:'15-20',rest:'60s',video:'https://www.youtube.com/results?search_query=agachamento+com+salto'},
    {name:'Mountain Climber',sets:3,reps:'20-30',rest:'45s',video:'https://www.youtube.com/results?search_query=mountain+climber'},
    {name:'Kettlebell Swing',sets:3,reps:'15-20',rest:'60s',video:'https://www.youtube.com/results?search_query=kettlebell+swing'},
    {name:'Thruster com Halteres',sets:3,reps:'12-15',rest:'75s',video:'https://www.youtube.com/results?search_query=thruster+halteres'},
  ],
  Cardio:[
    {name:'Esteira — Corrida Moderada',sets:1,reps:'30 min',rest:'—',video:'https://www.youtube.com/results?search_query=treino+esteira'},
    {name:'Bicicleta Ergométrica',sets:1,reps:'25 min',rest:'—',video:'https://www.youtube.com/results?search_query=treino+bicicleta+ergométrica'},
    {name:'Elíptico',sets:1,reps:'25 min',rest:'—',video:'https://www.youtube.com/results?search_query=elíptico+treino'},
    {name:'HIIT — Tiro Intervalado',sets:6,reps:'30s/30s',rest:'30s',video:'https://www.youtube.com/results?search_query=HIIT+treino+intervalado'},
    {name:'Pular Corda',sets:3,reps:'3 min',rest:'60s',video:'https://www.youtube.com/results?search_query=pular+corda+treino'},
  ],
  Descanso:[],
};

const FREQ_PRESETS = {
  3: { days: [1, 3, 5], groups: ['Peito', 'Costas', 'Pernas'],           label: '3x — Seg / Qua / Sex' },
  4: { days: [1, 2, 4, 5], groups: ['Peito', 'Costas', 'Pernas', 'Ombro'], label: '4x — Seg / Ter / Qui / Sex' },
  5: { days: [1, 2, 3, 4, 5], groups: ['Peito', 'Costas', 'Pernas', 'Ombro', 'Braços'], label: '5x — Seg a Sex' },
  6: { days: [1, 2, 3, 4, 5, 6], groups: ['Peito', 'Costas', 'Pernas', 'Ombro', 'Braços', 'Full Body'], label: '6x — Seg a Sáb' },
};

function ConfigWeekModal({ onConfirm, onClose }) {
  const [freq, setFreq] = useState(3);
  const [dayGroups, setDayGroups] = useState(() => {
    const p = FREQ_PRESETS[3];
    return Object.fromEntries(p.days.map((d, i) => [d, p.groups[i]]));
  });
  const [saving, setSaving] = useState(false);

  const applyFreq = (f) => {
    setFreq(f);
    const p = FREQ_PRESETS[f];
    setDayGroups(Object.fromEntries(p.days.map((d, i) => [d, p.groups[i]])));
  };

  const toggleDay = (dv) => {
    if (dayGroups[dv] !== undefined) {
      const next = { ...dayGroups };
      delete next[dv];
      setDayGroups(next);
    } else {
      setDayGroups(prev => ({ ...prev, [dv]: 'Peito' }));
    }
  };

  const handleConfirm = async () => {
    setSaving(true);
    await onConfirm(dayGroups);
    setSaving(false);
    onClose();
  };

  const days = DAYS;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', padding: 0 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 600, margin: '0 auto', padding: '24px 20px 36px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>Configurar Semana</h3>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#9CA3AF' }}>Monte a divisão semanal em segundos</p>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={17} color="#6B7280" />
          </button>
        </div>

        {/* Frequência */}
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Frequência semanal</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
          {[3, 4, 5, 6].map(f => (
            <button key={f} onClick={() => applyFreq(f)}
              style={{ padding: '14px 8px', borderRadius: 14, border: `2.5px solid ${freq === f ? '#3B82F6' : '#E5E7EB'}`, background: freq === f ? '#EFF6FF' : 'white', cursor: 'pointer', textAlign: 'center', transition: 'all 0.12s' }}>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: freq === f ? '#3B82F6' : '#374151' }}>{f}x</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: freq === f ? '#3B82F6' : '#9CA3AF', fontWeight: 600 }}>por semana</p>
            </button>
          ))}
        </div>

        {/* Dias + grupos */}
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Dias e grupos musculares</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
          {days.map(d => {
            const selected = dayGroups[d.value] !== undefined;
            const grp = dayGroups[d.value];
            const gc = grp ? (GROUP_COLORS[grp] || '#3B82F6') : '#E5E7EB';
            return (
              <div key={d.value} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, border: `2px solid ${selected ? gc + '60' : '#F1F5F9'}`, background: selected ? gc + '08' : '#F9FAFB', transition: 'all 0.12s' }}>
                <button onClick={() => toggleDay(d.value)}
                  style={{ width: 28, height: 28, borderRadius: 8, border: `2px solid ${selected ? gc : '#D1D5DB'}`, background: selected ? gc : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.12s' }}>
                  {selected && <Check size={15} color="white" strokeWidth={3} />}
                </button>
                <span style={{ width: 44, fontSize: 14, fontWeight: 700, color: selected ? '#111827' : '#9CA3AF' }}>{d.full.slice(0, 6)}.</span>
                {selected ? (
                  <select value={grp} onChange={e => setDayGroups(prev => ({ ...prev, [d.value]: e.target.value }))}
                    style={{ flex: 1, fontSize: 14, fontWeight: 700, color: gc, border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', boxShadow: 'none' }}>
                    {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                ) : (
                  <span style={{ flex: 1, fontSize: 13, color: '#C4C4C4' }}>Descanso</span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Check size={16} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: 13, color: '#065F46', lineHeight: 1.5 }}>
            <strong>{Object.keys(dayGroups).length} dias de treino</strong> serão configurados com os exercícios padrão de cada grupo. Você pode editar depois.
          </p>
        </div>

        <button onClick={handleConfirm} disabled={saving || Object.keys(dayGroups).length === 0}
          style={{ width: '100%', padding: '16px', background: saving ? '#9CA3AF' : 'linear-gradient(135deg, #3B82F6, #8B5CF6)', color: 'white', border: 'none', borderRadius: 14, cursor: 'pointer', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {saving ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={18} />}
          {saving ? 'Configurando...' : `Configurar ${Object.keys(dayGroups).length} dias`}
        </button>
      </div>
    </div>
  );
}

export default function Treinos() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState('');
  const [day, setDay] = useState(null);
  const [group, setGroup] = useState('Peito');
  const [exercises, setExercises] = useState([]); // exercícios do treino desse dia
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [configModal, setConfigModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (hasSupabase) {
      Promise.all([
        supabase.from('training_plans').select('*, exercises(*)').eq('personal_id', user.id),
        supabase.from('students').select('id, name, initials, color').eq('personal_id', user.id).eq('status', 'ativo'),
      ]).then(([{ data: p }, { data: s }]) => {
        setPlans(p || []);
        setStudents(s || []);
        setLoading(false);
      });
    } else {
      setPlans(mockPlans);
      setStudents(mockStudents);
      setLoading(false);
    }
  }, [user?.id]);

  const myPlans = plans.filter(p => String(p.student_id || p.studentId) === String(studentId));
  const planForDay = (d) => myPlans.find(p => (p.days || []).includes(d));

  const openDay = (d) => {
    setDay(d);
    setSaved(false);
    const plan = planForDay(d);
    if (plan) {
      setGroup(plan.name || 'Peito');
      setExercises((plan.exercises || [])
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        .map(ex => ({ name: ex.name, sets: ex.sets || 3, reps: ex.reps || '12', rest: ex.rest || '60s', load: ex.load || '', videoUrl: ex.video_url || '' }))
      );
    } else {
      setGroup('Peito');
      setExercises([]);
    }
  };

  const toggleExercise = (libEx) => {
    const idx = exercises.findIndex(e => e.name === libEx.name);
    if (idx >= 0) {
      setExercises(prev => prev.filter((_, i) => i !== idx));
    } else {
      setExercises(prev => [...prev, { name: libEx.name, sets: libEx.sets, reps: libEx.reps, rest: libEx.rest, load: '', videoUrl: libEx.video || '' }]);
    }
  };

  const updateEx = (idx, field, val) => {
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e));
  };

  const handleSave = async () => {
    if (!studentId || day === null) return;
    setSaving(true);
    const student = students.find(s => String(s.id) === String(studentId));
    const validEx = exercises.filter(e => e.name?.trim());
    const existing = planForDay(day);
    if (hasSupabase) {
      if (existing) {
        await supabase.from('training_plans').update({ name: group, type: 'Hipertrofia' }).eq('id', existing.id);
        await supabase.from('exercises').delete().eq('plan_id', existing.id);
        if (validEx.length) await supabase.from('exercises').insert(validEx.map((e, i) => ({ plan_id: existing.id, name: e.name, sets: parseInt(e.sets)||3, reps: e.reps, load: e.load||'', rest: e.rest, video_url: e.videoUrl||'', obs:'', order_index: i })));
        const { data: updated } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', existing.id).single();
        if (updated) setPlans(prev => prev.map(p => p.id === existing.id ? updated : p));
      } else {
        const { data: plan } = await supabase.from('training_plans').insert({ personal_id: user.id, student_id: student?.id, student_name: student?.name, name: group, type: 'Hipertrofia', days: [day] }).select().single();
        if (plan) {
          if (validEx.length) await supabase.from('exercises').insert(validEx.map((e, i) => ({ plan_id: plan.id, name: e.name, sets: parseInt(e.sets)||3, reps: e.reps, load: e.load||'', rest: e.rest, video_url: e.videoUrl||'', obs:'', order_index: i })));
          const { data: full } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', plan.id).single();
          if (full) setPlans(prev => [full, ...prev]);
        }
      }
    } else {
      if (existing) setPlans(prev => prev.map(p => p.id === existing.id ? { ...p, name: group, exercises: validEx } : p));
      else setPlans(prev => [{ id: Date.now(), student_id: studentId, student_name: student?.name, name: group, type: 'Hipertrofia', days: [day], exercises: validEx, created_at: new Date().toISOString() }, ...prev]);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Configura a semana inteira de uma vez
  const handleConfigWeek = async (dayGroups) => {
    const student = students.find(s => String(s.id) === String(studentId));
    if (!student) return;

    const newPlans = [];
    for (const [dayVal, grpName] of Object.entries(dayGroups)) {
      const dv = parseInt(dayVal);
      const defaultExercises = (EXERCISE_DB[grpName] || []).map((e, i) => ({
        name: e.name, sets: e.sets, reps: e.reps, rest: e.rest, load: '', video_url: e.video || '', obs: '', order_index: i,
      }));

      const existing = myPlans.find(p => (p.days || []).includes(dv));

      if (hasSupabase) {
        if (existing) {
          await supabase.from('training_plans').update({ name: grpName, type: 'Hipertrofia' }).eq('id', existing.id);
          await supabase.from('exercises').delete().eq('plan_id', existing.id);
          if (defaultExercises.length) await supabase.from('exercises').insert(defaultExercises.map(e => ({ ...e, plan_id: existing.id })));
          const { data: updated } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', existing.id).single();
          if (updated) newPlans.push({ type: 'update', plan: updated });
        } else {
          const { data: plan } = await supabase.from('training_plans').insert({
            personal_id: user.id, student_id: student.id, student_name: student.name,
            name: grpName, type: 'Hipertrofia', days: [dv],
          }).select().single();
          if (plan) {
            if (defaultExercises.length) await supabase.from('exercises').insert(defaultExercises.map(e => ({ ...e, plan_id: plan.id })));
            const { data: full } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', plan.id).single();
            if (full) newPlans.push({ type: 'insert', plan: full });
          }
        }
      } else {
        const mockPlan = { id: Date.now() + dv, student_id: studentId, student_name: student.name, name: grpName, type: 'Hipertrofia', days: [dv], exercises: defaultExercises, created_at: new Date().toISOString() };
        newPlans.push({ type: 'insert', plan: mockPlan });
      }
    }

    setPlans(prev => {
      let updated = [...prev];
      for (const { type, plan } of newPlans) {
        if (type === 'update') updated = updated.map(p => p.id === plan.id ? plan : p);
        else updated = [...updated, plan];
      }
      return updated;
    });
  };

  const handleDeleteDay = async () => {
    const existing = planForDay(day);
    if (!existing) return;
    if (hasSupabase) await supabase.from('training_plans').delete().eq('id', existing.id);
    setPlans(prev => prev.filter(p => p.id !== existing.id));
    setExercises([]);
    setDay(null);
  };

  const gc = GROUP_COLORS[group] || '#3B82F6';
  const libEx = EXERCISE_DB[group] || [];
  const dayInfo = DAYS.find(d => d.value === day);
  const selectedStudent = students.find(s => String(s.id) === studentId);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <Loader size={24} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="page-padding" style={{ flex: 1 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#111827' }}>Treinos</h2>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: '#9CA3AF' }}>Monte o treino de cada aluno por dia da semana</p>

      {/* PASSO 1: Selecionar aluno */}
      <div style={{ background: 'white', borderRadius: 16, padding: '18px 20px', marginBottom: 16, border: '1px solid #F1F5F9', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>1. Selecione o aluno</p>
        {students.length === 0 ? (
          <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>Nenhum aluno ativo cadastrado.</p>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {students.map(s => {
              const active = String(s.id) === studentId;
              return (
                <button key={s.id} onClick={() => { setStudentId(String(s.id)); setDay(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 40, border: `2px solid ${active ? '#3B82F6' : '#E5E7EB'}`, background: active ? '#EFF6FF' : 'white', cursor: 'pointer', transition: 'all 0.12s', minHeight: 48 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: s.color || '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                    {s.initials || s.name?.slice(0,2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: active ? '#1D4ED8' : '#374151' }}>{s.name.split(' ')[0]}</span>
                  {active && <Check size={16} color="#3B82F6" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {studentId && (
        <>
          {/* PASSO 2: Selecionar dia */}
          <div style={{ background: 'white', borderRadius: 16, padding: '18px 20px', marginBottom: 16, border: '1px solid #F1F5F9', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>2. Selecione o dia</p>
              <button onClick={() => setConfigModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 20, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                Configurar semana
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {DAYS.map(d => {
                const plan = planForDay(d.value);
                const isActive = day === d.value;
                const gc2 = plan ? (GROUP_COLORS[plan.name] || '#6B7280') : null;
                return (
                  <button key={d.value} onClick={() => openDay(d.value)}
                    style={{ flex: '0 0 auto', minWidth: 80, padding: '14px 8px', borderRadius: 14, border: `2.5px solid ${isActive ? '#3B82F6' : plan ? gc2 + '60' : '#E5E7EB'}`, background: isActive ? '#EFF6FF' : plan ? gc2 + '12' : '#F9FAFB', cursor: 'pointer', textAlign: 'center', transition: 'all 0.12s', boxShadow: isActive ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 800, color: isActive ? '#3B82F6' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.label}</p>
                    {plan ? (
                      <>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: gc2, lineHeight: 1.3 }}>{plan.name}</p>
                        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#9CA3AF' }}>{(plan.exercises||[]).length} ex.</p>
                      </>
                    ) : (
                      <p style={{ margin: 0, fontSize: 11, color: '#C4C4C4' }}>Livre</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PASSO 3: Montar treino */}
          {day !== null && (
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #F1F5F9', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12, background: gc + '08' }}>
                <button onClick={() => setDay(null)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'white', border: '1px solid #E5E7EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X size={16} color="#6B7280" />
                </button>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>{dayInfo?.full}</p>
                  <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: gc }}>{group}</p>
                </div>
                {planForDay(day) && (
                  <button onClick={handleDeleteDay} style={{ width: 36, height: 36, borderRadius: '50%', background: '#FEF2F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Trash2 size={16} color="#EF4444" />
                  </button>
                )}
                <button onClick={handleSave} disabled={saving}
                  style={{ padding: '10px 20px', background: saved ? '#10B981' : gc, color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1, minHeight: 44 }}>
                  {saving ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <Check size={15} /> : <Save size={15} />}
                  {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar'}
                </button>
              </div>

              <div style={{ padding: '18px 20px' }}>
                {/* Grupo muscular */}
                <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Grupo muscular</p>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 22, paddingBottom: 4 }}>
                  {GROUPS.map(g => (
                    <button key={g} onClick={() => setGroup(g)}
                      style={{ flex: '0 0 auto', padding: '10px 18px', borderRadius: 24, border: `2px solid ${group === g ? (GROUP_COLORS[g]||'#3B82F6') : '#E5E7EB'}`, background: group === g ? (GROUP_COLORS[g]||'#3B82F6') : 'white', color: group === g ? 'white' : '#6B7280', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.12s', minHeight: 44 }}>
                      {g}
                    </button>
                  ))}
                </div>

                {/* Lista de exercícios */}
                {libEx.length > 0 && (
                  <>
                    <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      Exercícios — toque para adicionar
                    </p>
                    <div style={{ borderRadius: 12, border: '1px solid #F1F5F9', overflow: 'hidden', marginBottom: 20 }}>
                      {libEx.map((libE, i) => {
                        const added = exercises.some(e => e.name === libE.name);
                        return (
                          <div key={libE.name}
                            onClick={() => toggleExercise(libE)}
                            style={{ display: 'flex', alignItems: 'center', padding: '15px 16px', borderBottom: i < libEx.length - 1 ? '1px solid #F3F4F6' : 'none', background: added ? gc + '10' : 'white', cursor: 'pointer', gap: 14, transition: 'background 0.1s', minHeight: 64 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, border: `2.5px solid ${added ? gc : '#D1D5DB'}`, background: added ? gc : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s' }}>
                              {added && <Check size={16} color="white" strokeWidth={3} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 15, fontWeight: added ? 700 : 500, color: '#111827' }}>{libE.name}</p>
                              <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9CA3AF' }}>{libE.sets} séries · {libE.reps} · descanso {libE.rest}</p>
                            </div>
                            <a href={libE.video} target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ padding: '8px 14px', borderRadius: 8, background: '#FEF3C7', color: '#D97706', textDecoration: 'none', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, minHeight: 38 }}>
                              <Play size={12} fill="#D97706" /> Ver
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Exercícios adicionados */}
                {exercises.length > 0 && (
                  <>
                    <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: gc, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      Treino montado — {exercises.length} exercício{exercises.length !== 1 ? 's' : ''}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
                      {exercises.map((ex, i) => (
                        <div key={i} style={{ background: '#F9FAFB', borderRadius: 14, border: `1.5px solid ${gc}25`, padding: '14px 16px' }}>
                          {/* Nome + remover */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: gc + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: gc, flexShrink: 0 }}>{i + 1}</div>
                            <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#111827' }}>{ex.name}</span>
                            <button onClick={() => setExercises(prev => prev.filter((_, j) => j !== i))}
                              style={{ width: 34, height: 34, borderRadius: '50%', background: '#FEF2F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <X size={15} color="#EF4444" />
                            </button>
                          </div>
                          {/* Controles em grid 2x2 */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {/* Séries */}
                            <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E5E7EB', padding: '10px 12px' }}>
                              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Séries</p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                                <button onClick={() => updateEx(i, 'sets', Math.max(1, (parseInt(ex.sets)||3) - 1))}
                                  style={{ width: 36, height: 36, background: '#F3F4F6', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 20, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>−</button>
                                <span style={{ flex: 1, fontSize: 20, fontWeight: 800, color: '#111827', textAlign: 'center' }}>{ex.sets}</span>
                                <button onClick={() => updateEx(i, 'sets', (parseInt(ex.sets)||3) + 1)}
                                  style={{ width: 36, height: 36, background: '#F3F4F6', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 20, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>+</button>
                              </div>
                            </div>
                            {/* Reps */}
                            <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E5E7EB', padding: '10px 12px' }}>
                              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Repetições</p>
                              <input value={ex.reps} onChange={e => updateEx(i, 'reps', e.target.value)}
                                style={{ width: '100%', fontSize: 18, fontWeight: 700, textAlign: 'center', border: 'none', background: 'transparent', padding: 0, outline: 'none', boxShadow: 'none', height: 36 }} placeholder="10-12" />
                            </div>
                            {/* Carga */}
                            <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E5E7EB', padding: '10px 12px' }}>
                              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Carga (kg)</p>
                              <input value={ex.load} onChange={e => updateEx(i, 'load', e.target.value)}
                                style={{ width: '100%', fontSize: 18, fontWeight: 700, textAlign: 'center', border: 'none', background: 'transparent', padding: 0, outline: 'none', boxShadow: 'none', height: 36 }} placeholder="—" />
                            </div>
                            {/* Descanso */}
                            <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E5E7EB', padding: '10px 12px' }}>
                              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Descanso</p>
                              <select value={ex.rest} onChange={e => updateEx(i, 'rest', e.target.value)}
                                style={{ width: '100%', fontSize: 16, fontWeight: 700, textAlign: 'center', border: 'none', background: 'transparent', padding: 0, outline: 'none', boxShadow: 'none', height: 36, appearance: 'none', cursor: 'pointer' }}>
                                {['30s','45s','60s','75s','90s','2min'].map(r => <option key={r}>{r}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {exercises.length === 0 && group !== 'Descanso' && (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#9CA3AF', fontSize: 14 }}>
                    Toque nos exercícios acima para adicionar ao treino
                  </div>
                )}

                {group === 'Descanso' && (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <p style={{ margin: 0, fontSize: 16, color: '#6B7280', fontWeight: 600 }}>Dia de descanso</p>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9CA3AF' }}>Nenhum exercício para este dia</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {configModal && studentId && (
        <ConfigWeekModal onConfirm={handleConfigWeek} onClose={() => setConfigModal(false)} />
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
