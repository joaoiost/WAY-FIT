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
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#9CA3AF' }}>Monte o treino de cada aluno por dia da semana</p>

      {/* PASSO 1: Selecionar aluno */}
      <div style={{ background: 'white', borderRadius: 14, padding: 16, marginBottom: 16, border: '1px solid #F1F5F9', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>1. Selecione o aluno</p>
        {students.length === 0 ? (
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Nenhum aluno ativo cadastrado.</p>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {students.map(s => {
              const active = String(s.id) === studentId;
              return (
                <button key={s.id} onClick={() => { setStudentId(String(s.id)); setDay(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 30, border: `2px solid ${active ? '#3B82F6' : '#E5E7EB'}`, background: active ? '#EFF6FF' : 'white', cursor: 'pointer', transition: 'all 0.12s' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.color || '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                    {s.initials || s.name?.slice(0,2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: active ? '#1D4ED8' : '#374151' }}>{s.name.split(' ')[0]}</span>
                  {active && <Check size={13} color="#3B82F6" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {studentId && (
        <>
          {/* PASSO 2: Selecionar dia */}
          <div style={{ background: 'white', borderRadius: 14, padding: 16, marginBottom: 16, border: '1px solid #F1F5F9', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>2. Selecione o dia</p>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {DAYS.map(d => {
                const plan = planForDay(d.value);
                const isActive = day === d.value;
                const gc2 = plan ? (GROUP_COLORS[plan.name] || '#6B7280') : null;
                return (
                  <button key={d.value} onClick={() => openDay(d.value)}
                    style={{ flex: '0 0 auto', minWidth: 70, padding: '10px 6px', borderRadius: 12, border: `2px solid ${isActive ? '#3B82F6' : plan ? gc2 + '50' : '#E5E7EB'}`, background: isActive ? '#EFF6FF' : plan ? gc2 + '10' : '#F9FAFB', cursor: 'pointer', textAlign: 'center', transition: 'all 0.12s' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: isActive ? '#3B82F6' : '#9CA3AF', textTransform: 'uppercase' }}>{d.label}</p>
                    {plan ? (
                      <>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: gc2 }}>{plan.name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#9CA3AF' }}>{(plan.exercises||[]).length} ex.</p>
                      </>
                    ) : (
                      <p style={{ margin: 0, fontSize: 10, color: '#C4C4C4' }}>Vazio</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PASSO 3: Montar treino */}
          {day !== null && (
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #F1F5F9', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              {/* Header do editor */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10, background: gc + '08' }}>
                <button onClick={() => setDay(null)} style={{ width: 30, height: 30, borderRadius: '50%', background: 'white', border: '1px solid #E5E7EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X size={14} color="#6B7280" />
                </button>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>{dayInfo?.full}</p>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: gc }}>{group}</p>
                </div>
                {planForDay(day) && (
                  <button onClick={handleDeleteDay} style={{ padding: '5px 10px', background: '#FEF2F2', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#EF4444', fontSize: 12, fontWeight: 700 }}>
                    <Trash2 size={13} />
                  </button>
                )}
                <button onClick={handleSave} disabled={saving}
                  style={{ padding: '8px 16px', background: saved ? '#10B981' : gc, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, opacity: saving ? 0.7 : 1 }}>
                  {saving ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <Check size={13} /> : <Save size={13} />}
                  {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar'}
                </button>
              </div>

              <div style={{ padding: 16 }}>
                {/* Grupo muscular */}
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Grupo muscular</p>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 18, paddingBottom: 2 }}>
                  {GROUPS.map(g => (
                    <button key={g} onClick={() => setGroup(g)}
                      style={{ flex: '0 0 auto', padding: '7px 14px', borderRadius: 20, border: `2px solid ${group === g ? (GROUP_COLORS[g]||'#3B82F6') : '#E5E7EB'}`, background: group === g ? (GROUP_COLORS[g]||'#3B82F6') : 'white', color: group === g ? 'white' : '#6B7280', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.12s' }}>
                      {g}
                    </button>
                  ))}
                </div>

                {/* Lista de exercícios da biblioteca */}
                {libEx.length > 0 && (
                  <>
                    <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Exercícios — clique para adicionar
                    </p>
                    <div style={{ borderRadius: 10, border: '1px solid #F1F5F9', overflow: 'hidden', marginBottom: 16 }}>
                      {libEx.map((libE, i) => {
                        const added = exercises.some(e => e.name === libE.name);
                        return (
                          <div key={libE.name}
                            onClick={() => toggleExercise(libE)}
                            style={{ display: 'flex', alignItems: 'center', padding: '11px 14px', borderBottom: i < libEx.length - 1 ? '1px solid #F9FAFB' : 'none', background: added ? gc + '10' : 'white', cursor: 'pointer', gap: 10, transition: 'background 0.1s' }}>
                            <div style={{ width: 24, height: 24, borderRadius: 7, border: `2px solid ${added ? gc : '#D1D5DB'}`, background: added ? gc : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {added && <Check size={13} color="white" strokeWidth={3} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: added ? 700 : 500, color: '#111827' }}>{libE.name}</p>
                              <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>{libE.sets} séries · {libE.reps} · descanso {libE.rest}</p>
                            </div>
                            <a href={libE.video} target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ padding: '4px 10px', borderRadius: 6, background: '#FEF3C7', color: '#D97706', textDecoration: 'none', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                              <Play size={10} fill="#D97706" /> Ver
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Exercícios adicionados com edição */}
                {exercises.length > 0 && (
                  <>
                    <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: gc, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Treino montado — {exercises.length} exercício{exercises.length !== 1 ? 's' : ''}
                    </p>
                    <div style={{ borderRadius: 10, border: `1px solid ${gc}25`, overflow: 'hidden', marginBottom: 8 }}>
                      {exercises.map((ex, i) => (
                        <div key={i} style={{ padding: '11px 14px', borderBottom: i < exercises.length - 1 ? '1px solid #F9FAFB' : 'none', background: 'white' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ width: 20, height: 20, borderRadius: '50%', background: gc + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: gc, flexShrink: 0 }}>{i + 1}</span>
                            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#111827' }}>{ex.name}</span>
                            <button onClick={() => setExercises(prev => prev.filter((_, j) => j !== i))}
                              style={{ padding: 3, background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', display: 'flex' }}>
                              <X size={14} />
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingLeft: 28 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F9FAFB', borderRadius: 8, padding: '4px 8px', border: '1px solid #E5E7EB' }}>
                              <button onClick={() => updateEx(i, 'sets', Math.max(1, (parseInt(ex.sets)||3) - 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#6B7280', padding: 0, lineHeight: 1 }}>−</button>
                              <span style={{ fontSize: 13, fontWeight: 700, minWidth: 14, textAlign: 'center' }}>{ex.sets}</span>
                              <button onClick={() => updateEx(i, 'sets', (parseInt(ex.sets)||3) + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#6B7280', padding: 0, lineHeight: 1 }}>+</button>
                              <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 2 }}>séries</span>
                            </div>
                            <input value={ex.reps} onChange={e => updateEx(i, 'reps', e.target.value)}
                              style={{ width: 70, fontSize: 12, padding: '4px 8px', textAlign: 'center' }} placeholder="Reps" />
                            <div style={{ position: 'relative', width: 80 }}>
                              <input value={ex.load} onChange={e => updateEx(i, 'load', e.target.value)}
                                style={{ width: '100%', fontSize: 12, padding: '4px 22px 4px 8px', textAlign: 'center' }} placeholder="Carga" />
                              <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#9CA3AF', pointerEvents: 'none' }}>kg</span>
                            </div>
                            <select value={ex.rest} onChange={e => updateEx(i, 'rest', e.target.value)}
                              style={{ fontSize: 12, padding: '4px 8px', width: 80 }}>
                              {['30s','45s','60s','75s','90s','2min'].map(r => <option key={r}>{r}</option>)}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {exercises.length === 0 && group !== 'Descanso' && (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: '#9CA3AF', fontSize: 13 }}>
                    Clique nos exercícios acima para adicionar ao treino
                  </div>
                )}

                {group === 'Descanso' && (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <p style={{ margin: 0, fontSize: 14, color: '#6B7280', fontWeight: 600 }}>Dia de descanso — sem exercícios</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
