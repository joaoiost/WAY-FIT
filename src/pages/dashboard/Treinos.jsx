import { useState, useEffect } from 'react';
import { Plus, Dumbbell, Trash2, X, Play, Loader, Save, ChevronDown, Check, Copy, ArrowLeft, ExternalLink } from 'lucide-react';
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

const GROUPS = ['Peito', 'Costas', 'Pernas', 'Ombro', 'Braços', 'Abdômen', 'Full Body', 'Cardio', 'Descanso'];

const GROUP_TYPES = {
  Peito: 'Hipertrofia', Costas: 'Hipertrofia', Pernas: 'Hipertrofia',
  Ombro: 'Hipertrofia', Braços: 'Hipertrofia', Abdômen: 'Funcional',
  'Full Body': 'Funcional', Cardio: 'Cardio', Descanso: 'Mobilidade',
};

const GROUP_COLORS = {
  Peito: '#EF4444', Costas: '#3B82F6', Pernas: '#8B5CF6', Ombro: '#F59E0B',
  Braços: '#10B981', Abdômen: '#06B6D4', 'Full Body': '#EC4899', Cardio: '#F97316',
  Descanso: '#9CA3AF',
};

// Banco completo de exercícios com vídeos (YouTube search links)
const EXERCISE_DB = {
  Peito: [
    { name: 'Supino Reto com Barra',           sets: 4, reps: '8-10',  rest: '90s', video: 'https://www.youtube.com/results?search_query=supino+reto+barra+execução+correta' },
    { name: 'Supino Inclinado com Halteres',    sets: 3, reps: '10-12', rest: '75s', video: 'https://www.youtube.com/results?search_query=supino+inclinado+halteres+como+fazer' },
    { name: 'Supino Declinado com Barra',       sets: 3, reps: '10-12', rest: '75s', video: 'https://www.youtube.com/results?search_query=supino+declinado+barra+como+fazer' },
    { name: 'Supino com Halteres',              sets: 3, reps: '10-12', rest: '75s', video: 'https://www.youtube.com/results?search_query=supino+halteres+dumbbell+press+como+fazer' },
    { name: 'Crucifixo com Halteres',           sets: 3, reps: '12-15', rest: '60s', video: 'https://www.youtube.com/results?search_query=crucifixo+halteres+peito+como+fazer' },
    { name: 'Pec Deck (Voador)',                sets: 3, reps: '12-15', rest: '60s', video: 'https://www.youtube.com/results?search_query=pec+deck+voador+peito+como+fazer' },
    { name: 'Crossover no Cabo',               sets: 3, reps: '12-15', rest: '60s', video: 'https://www.youtube.com/results?search_query=crossover+cabo+peito+como+fazer' },
    { name: 'Pullover com Haltere',            sets: 3, reps: '12-15', rest: '60s', video: 'https://www.youtube.com/results?search_query=pullover+haltere+peito+como+fazer' },
    { name: 'Flexão de Braço',                 sets: 3, reps: '15-20', rest: '60s', video: 'https://www.youtube.com/results?search_query=flexão+de+braço+push+up+como+fazer' },
  ],
  Costas: [
    { name: 'Puxada Frontal na Polia',         sets: 4, reps: '8-12',  rest: '90s', video: 'https://www.youtube.com/results?search_query=puxada+frontal+polia+como+fazer' },
    { name: 'Remada Curvada com Barra',        sets: 4, reps: '8-10',  rest: '90s', video: 'https://www.youtube.com/results?search_query=remada+curvada+barra+como+fazer' },
    { name: 'Remada Unilateral com Haltere',   sets: 3, reps: '10-12', rest: '75s', video: 'https://www.youtube.com/results?search_query=remada+unilateral+haltere+como+fazer' },
    { name: 'Remada Cavalinho (Serrote)',       sets: 3, reps: '10-12', rest: '75s', video: 'https://www.youtube.com/results?search_query=remada+cavalinho+serrote+como+fazer' },
    { name: 'Levantamento Terra',              sets: 3, reps: '6-8',   rest: '120s', video: 'https://www.youtube.com/results?search_query=levantamento+terra+deadlift+como+fazer' },
    { name: 'Puxada com Triângulo',            sets: 3, reps: '10-12', rest: '75s', video: 'https://www.youtube.com/results?search_query=puxada+triangulo+costas+como+fazer' },
    { name: 'Pull-up (Barra Fixa)',            sets: 3, reps: '8-12',  rest: '90s', video: 'https://www.youtube.com/results?search_query=pull+up+barra+fixa+como+fazer' },
    { name: 'Remada Sentado no Cabo',          sets: 3, reps: '12-15', rest: '60s', video: 'https://www.youtube.com/results?search_query=remada+sentado+cabo+costas+como+fazer' },
    { name: 'Hiperextensão Lombar',            sets: 3, reps: '12-15', rest: '60s', video: 'https://www.youtube.com/results?search_query=hiperextensão+lombar+como+fazer' },
  ],
  Pernas: [
    { name: 'Agachamento Livre com Barra',     sets: 4, reps: '8-10',  rest: '120s', video: 'https://www.youtube.com/results?search_query=agachamento+livre+barra+como+fazer' },
    { name: 'Leg Press 45°',                   sets: 4, reps: '10-12', rest: '90s', video: 'https://www.youtube.com/results?search_query=leg+press+45+graus+como+fazer' },
    { name: 'Extensora (Cadeira Extensora)',    sets: 3, reps: '12-15', rest: '60s', video: 'https://www.youtube.com/results?search_query=extensora+cadeira+extensora+quadríceps+como+fazer' },
    { name: 'Flexora (Mesa Flexora)',           sets: 3, reps: '12-15', rest: '60s', video: 'https://www.youtube.com/results?search_query=mesa+flexora+isquiotibiais+como+fazer' },
    { name: 'Stiff com Halteres',              sets: 3, reps: '10-12', rest: '75s', video: 'https://www.youtube.com/results?search_query=stiff+halteres+posterior+coxa+como+fazer' },
    { name: 'Afundo com Halteres',             sets: 3, reps: '12 cada', rest: '75s', video: 'https://www.youtube.com/results?search_query=afundo+lunges+halteres+como+fazer' },
    { name: 'Adutora na Máquina',              sets: 3, reps: '15-20', rest: '60s', video: 'https://www.youtube.com/results?search_query=adutora+maquina+como+fazer' },
    { name: 'Abdutora na Máquina',             sets: 3, reps: '15-20', rest: '60s', video: 'https://www.youtube.com/results?search_query=abdutora+maquina+como+fazer' },
    { name: 'Panturrilha em Pé',               sets: 4, reps: '15-20', rest: '60s', video: 'https://www.youtube.com/results?search_query=panturrilha+em+pé+como+fazer' },
    { name: 'Hack Squat na Máquina',           sets: 3, reps: '10-12', rest: '90s', video: 'https://www.youtube.com/results?search_query=hack+squat+maquina+como+fazer' },
  ],
  Ombro: [
    { name: 'Desenvolvimento com Halteres',    sets: 4, reps: '10-12', rest: '75s', video: 'https://www.youtube.com/results?search_query=desenvolvimento+halteres+ombro+como+fazer' },
    { name: 'Desenvolvimento Militar com Barra', sets: 4, reps: '8-10', rest: '90s', video: 'https://www.youtube.com/results?search_query=desenvolvimento+militar+barra+como+fazer' },
    { name: 'Elevação Lateral com Halteres',   sets: 3, reps: '12-15', rest: '60s', video: 'https://www.youtube.com/results?search_query=elevação+lateral+halteres+como+fazer' },
    { name: 'Elevação Frontal com Halteres',   sets: 3, reps: '12-15', rest: '60s', video: 'https://www.youtube.com/results?search_query=elevação+frontal+halteres+deltóide+como+fazer' },
    { name: 'Voador Invertido (Deltóide Posterior)', sets: 3, reps: '12-15', rest: '60s', video: 'https://www.youtube.com/results?search_query=voador+invertido+deltóide+posterior+como+fazer' },
    { name: 'Encolhimento com Halteres',       sets: 3, reps: '12-15', rest: '60s', video: 'https://www.youtube.com/results?search_query=encolhimento+halteres+trapézio+como+fazer' },
    { name: 'Remada Alta com Barra',           sets: 3, reps: '10-12', rest: '60s', video: 'https://www.youtube.com/results?search_query=remada+alta+barra+ombro+como+fazer' },
  ],
  Braços: [
    { name: 'Rosca Direta com Barra',          sets: 3, reps: '10-12', rest: '75s', video: 'https://www.youtube.com/results?search_query=rosca+direta+barra+bíceps+como+fazer' },
    { name: 'Rosca Alternada com Halteres',    sets: 3, reps: '10-12', rest: '75s', video: 'https://www.youtube.com/results?search_query=rosca+alternada+halteres+bíceps+como+fazer' },
    { name: 'Rosca Martelo com Halteres',      sets: 3, reps: '10-12', rest: '75s', video: 'https://www.youtube.com/results?search_query=rosca+martelo+halteres+bíceps+como+fazer' },
    { name: 'Rosca Scott com Barra',           sets: 3, reps: '10-12', rest: '75s', video: 'https://www.youtube.com/results?search_query=rosca+scott+barra+como+fazer' },
    { name: 'Rosca Concentrada',               sets: 3, reps: '12-15', rest: '60s', video: 'https://www.youtube.com/results?search_query=rosca+concentrada+bíceps+como+fazer' },
    { name: 'Tríceps Pulley no Cabo',          sets: 3, reps: '12-15', rest: '60s', video: 'https://www.youtube.com/results?search_query=tríceps+pulley+corda+como+fazer' },
    { name: 'Tríceps Testa com Barra',         sets: 3, reps: '10-12', rest: '75s', video: 'https://www.youtube.com/results?search_query=tríceps+testa+barra+como+fazer' },
    { name: 'Tríceps Francês com Haltere',     sets: 3, reps: '10-12', rest: '75s', video: 'https://www.youtube.com/results?search_query=tríceps+francês+haltere+como+fazer' },
    { name: 'Tríceps Coice com Haltere',       sets: 3, reps: '12-15', rest: '60s', video: 'https://www.youtube.com/results?search_query=tríceps+coice+haltere+como+fazer' },
    { name: 'Mergulho no Banco (Tríceps)',      sets: 3, reps: '12-15', rest: '60s', video: 'https://www.youtube.com/results?search_query=mergulho+banco+triceps+como+fazer' },
  ],
  Abdômen: [
    { name: 'Crunch Abdominal',                sets: 3, reps: '20-25', rest: '45s', video: 'https://www.youtube.com/results?search_query=crunch+abdominal+como+fazer' },
    { name: 'Prancha Frontal',                 sets: 3, reps: '45-60s', rest: '45s', video: 'https://www.youtube.com/results?search_query=prancha+frontal+plank+como+fazer' },
    { name: 'Elevação de Pernas',              sets: 3, reps: '15-20', rest: '45s', video: 'https://www.youtube.com/results?search_query=elevação+de+pernas+abdominal+como+fazer' },
    { name: 'Abdominal Oblíquo',               sets: 3, reps: '20 cada', rest: '45s', video: 'https://www.youtube.com/results?search_query=abdominal+oblíquo+lateral+como+fazer' },
    { name: 'Bicicleta Abdominal',             sets: 3, reps: '20-30', rest: '45s', video: 'https://www.youtube.com/results?search_query=bicicleta+abdominal+como+fazer' },
    { name: 'Russian Twist',                   sets: 3, reps: '20-30', rest: '45s', video: 'https://www.youtube.com/results?search_query=russian+twist+abdominal+como+fazer' },
    { name: 'Abdominal na Máquina',            sets: 3, reps: '15-20', rest: '45s', video: 'https://www.youtube.com/results?search_query=abdominal+máquina+como+fazer' },
    { name: 'Hollow Body Hold',                sets: 3, reps: '30-45s', rest: '45s', video: 'https://www.youtube.com/results?search_query=hollow+body+hold+como+fazer' },
  ],
  'Full Body': [
    { name: 'Burpee',                          sets: 3, reps: '10-15', rest: '60s', video: 'https://www.youtube.com/results?search_query=burpee+como+fazer+correto' },
    { name: 'Agachamento com Salto',           sets: 3, reps: '15-20', rest: '60s', video: 'https://www.youtube.com/results?search_query=agachamento+com+salto+jump+squat+como+fazer' },
    { name: 'Mountain Climber',                sets: 3, reps: '20-30', rest: '45s', video: 'https://www.youtube.com/results?search_query=mountain+climber+como+fazer' },
    { name: 'Kettlebell Swing',                sets: 3, reps: '15-20', rest: '60s', video: 'https://www.youtube.com/results?search_query=kettlebell+swing+como+fazer' },
    { name: 'Thruster com Halteres',           sets: 3, reps: '12-15', rest: '75s', video: 'https://www.youtube.com/results?search_query=thruster+halteres+como+fazer' },
    { name: 'Clean and Press',                 sets: 3, reps: '8-10',  rest: '90s', video: 'https://www.youtube.com/results?search_query=clean+and+press+como+fazer' },
  ],
  Cardio: [
    { name: 'Esteira — Corrida Moderada',      sets: 1, reps: '30 min', rest: '—', video: 'https://www.youtube.com/results?search_query=treino+esteira+queimar+gordura' },
    { name: 'Bicicleta Ergométrica',           sets: 1, reps: '25 min', rest: '—', video: 'https://www.youtube.com/results?search_query=treino+bicicleta+ergométrica+como+fazer' },
    { name: 'Elíptico',                        sets: 1, reps: '25 min', rest: '—', video: 'https://www.youtube.com/results?search_query=elíptico+treino+como+usar' },
    { name: 'HIIT — Tiro Intervalado',         sets: 6, reps: '30s/30s', rest: '30s', video: 'https://www.youtube.com/results?search_query=HIIT+treino+intervalado+iniciante' },
    { name: 'Pular Corda',                     sets: 3, reps: '3 min',  rest: '60s', video: 'https://www.youtube.com/results?search_query=pular+corda+treino+como+fazer' },
    { name: 'Remo Ergométrico',                sets: 1, reps: '20 min', rest: '—', video: 'https://www.youtube.com/results?search_query=remo+ergométrico+como+usar' },
  ],
  Descanso: [],
};

const REPS_PRESETS = ['6', '8', '10', '12', '15', '20', 'Falha'];
const REST_PRESETS = ['30s', '45s', '60s', '75s', '90s', '2min'];

// Exercício já adicionado — linha compacta com edição inline
function ExerciseRow({ ex, index, total, onChange, onMove, groupColor }) {
  const [open, setOpen] = useState(false);
  const sets = parseInt(ex.sets) || 3;
  const gc = groupColor || '#3B82F6';

  return (
    <div style={{ background: 'white', borderRadius: 10, marginBottom: 6, border: `1px solid ${open ? gc + '40' : '#F1F5F9'}`, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', gap: 10 }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: gc + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: gc, flexShrink: 0 }}>{index + 1}</span>
        <input value={ex.name} onChange={e => onChange(index, 'name', e.target.value)}
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#111827', padding: 0, outline: 'none', minWidth: 0, boxShadow: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#F9FAFB', borderRadius: 18, padding: '3px 8px', border: '1px solid #E5E7EB', flexShrink: 0 }}>
          <button type="button" onClick={e => { e.stopPropagation(); onChange(index, 'sets', Math.max(1, sets - 1)); }}
            style={{ width: 16, height: 16, background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#6B7280', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#111827', minWidth: 14, textAlign: 'center' }}>{sets}</span>
          <button type="button" onClick={e => { e.stopPropagation(); onChange(index, 'sets', sets + 1); }}
            style={{ width: 16, height: 16, background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#6B7280', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          <span style={{ fontSize: 10, color: '#9CA3AF', margin: '0 2px' }}>×</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', minWidth: 26 }}>{ex.reps || '—'}</span>
        </div>
        <button type="button" onClick={() => setOpen(p => !p)}
          style={{ padding: 2, background: 'none', border: 'none', cursor: 'pointer', color: open ? gc : '#C4C4C4', display: 'flex', flexShrink: 0 }}>
          <ChevronDown size={15} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>
      </div>

      {!open && (ex.load || ex.rest) && (
        <p style={{ margin: '0 0 8px 44px', fontSize: 11, color: '#9CA3AF' }}>
          {[ex.load ? `${ex.load} kg` : null, ex.rest || null].filter(Boolean).join(' · ')}
        </p>
      )}

      {open && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid #F9FAFB' }}>
          <div style={{ marginBottom: 10, marginTop: 10 }}>
            <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Repetições</p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
              {REPS_PRESETS.map(r => (
                <button key={r} type="button" onClick={() => onChange(index, 'reps', r)}
                  style={{ padding: '4px 10px', borderRadius: 18, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${ex.reps === r ? gc : '#E5E7EB'}`, background: ex.reps === r ? gc + '15' : '#F9FAFB', color: ex.reps === r ? gc : '#6B7280' }}>
                  {r}
                </button>
              ))}
              <input value={REPS_PRESETS.includes(ex.reps) ? '' : (ex.reps || '')} onChange={e => onChange(index, 'reps', e.target.value)}
                placeholder="outro" style={{ width: 58, fontSize: 12, textAlign: 'center', padding: '4px 6px' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, marginBottom: 10 }}>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Carga</p>
              <div style={{ position: 'relative' }}>
                <input value={ex.load || ''} onChange={e => onChange(index, 'load', e.target.value)} placeholder="—" style={{ textAlign: 'center', fontWeight: 700, paddingRight: 26 }} />
                <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#9CA3AF', pointerEvents: 'none' }}>kg</span>
              </div>
            </div>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Descanso</p>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {REST_PRESETS.map(r => (
                  <button key={r} type="button" onClick={() => onChange(index, 'rest', r)}
                    style={{ padding: '4px 8px', borderRadius: 18, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${ex.rest === r ? gc : '#E5E7EB'}`, background: ex.rest === r ? gc + '15' : '#F9FAFB', color: ex.rest === r ? gc : '#6B7280' }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {ex.obs !== undefined && (
            <div style={{ marginBottom: 8 }}>
              <input placeholder="Observação (opcional)..." value={ex.obs || ''} onChange={e => onChange(index, 'obs', e.target.value)} style={{ fontSize: 12 }} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 5 }}>
            {index > 0 && <button type="button" onClick={() => onMove(index, -1)} style={{ padding: '4px 10px', fontSize: 11, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 7, cursor: 'pointer', color: '#374151', fontWeight: 600 }}>↑ Subir</button>}
            {index < total - 1 && <button type="button" onClick={() => onMove(index, 1)} style={{ padding: '4px 10px', fontSize: 11, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 7, cursor: 'pointer', color: '#374151', fontWeight: 600 }}>↓ Descer</button>}
            <button type="button" onClick={() => onChange(index, 'delete')} style={{ padding: '4px 10px', fontSize: 11, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 7, cursor: 'pointer', color: '#EF4444', fontWeight: 600, marginLeft: 'auto' }}>Remover</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Treinos() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [students, setStudents] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('Peito');
  const [form, setForm] = useState({ name: '', type: 'Hipertrofia', exercises: [] });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (hasSupabase) {
      Promise.all([
        supabase.from('training_plans').select('*, exercises(*)').eq('personal_id', user.id).order('created_at', { ascending: false }),
        supabase.from('students').select('id, name, initials, color').eq('personal_id', user.id).eq('status', 'ativo'),
      ]).then(([{ data: p }, { data: s }]) => {
        setPlans(p || []);
        setStudents(s || []);
        setLoadingData(false);
      });
    } else {
      setPlans(mockPlans);
      setStudents(mockStudents);
      setLoadingData(false);
    }
  }, [user?.id]);

  const studentPlans = plans.filter(p => String(p.student_id || p.studentId) === String(selectedStudentId));
  const planForDay = (day) => studentPlans.find(p => (p.days || []).includes(day));
  const selectedStudentObj = students.find(s => String(s.id) === selectedStudentId);

  const openDay = (day) => {
    setSelectedDay(day);
    setDeleteConfirm(false);
    setSaved(false);
    const plan = planForDay(day);
    if (plan) {
      setSelectedGroup(plan.name || 'Peito');
      setForm({
        name: plan.name, type: plan.type,
        exercises: (plan.exercises || [])
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
          .map(ex => ({ ...ex, videoUrl: ex.video_url || '', load: ex.load || '', obs: ex.obs || '' })),
      });
    } else {
      setSelectedGroup('Peito');
      setForm({ name: 'Peito', type: 'Hipertrofia', exercises: [] });
    }
  };

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    setForm(f => ({ ...f, name: group, type: GROUP_TYPES[group] || 'Hipertrofia' }));
  };

  const handleExerciseChange = (index, field, value) => {
    if (field === 'delete') {
      setForm(f => ({ ...f, exercises: f.exercises.filter((_, i) => i !== index) }));
    } else {
      setForm(f => { const exs = [...f.exercises]; exs[index] = { ...exs[index], [field]: value }; return { ...f, exercises: exs }; });
    }
  };

  const moveExercise = (index, dir) => {
    setForm(f => {
      const exs = [...f.exercises];
      const swap = index + dir;
      if (swap < 0 || swap >= exs.length) return f;
      [exs[index], exs[swap]] = [exs[swap], exs[index]];
      return { ...f, exercises: exs };
    });
  };

  // Toggle exercise from library
  const toggleExercise = (libEx) => {
    const isAdded = form.exercises.some(ex => ex.name === libEx.name);
    if (isAdded) {
      setForm(f => ({ ...f, exercises: f.exercises.filter(ex => ex.name !== libEx.name) }));
    } else {
      setForm(f => ({
        ...f,
        exercises: [...f.exercises, {
          name: libEx.name, sets: libEx.sets, reps: libEx.reps,
          rest: libEx.rest, load: '', videoUrl: libEx.video || '', obs: '',
        }],
      }));
    }
  };

  const addCustomExercise = () => {
    setForm(f => ({ ...f, exercises: [...f.exercises, { name: '', sets: 3, reps: '12', rest: '60s', load: '', videoUrl: '', obs: '' }] }));
  };

  const handleSave = async () => {
    if (!selectedStudentId || selectedDay === null || !form.name) return;
    const student = students.find(s => String(s.id) === String(selectedStudentId));
    const validExercises = form.exercises.filter(ex => ex.name?.trim());
    setSaving(true);
    const existingPlan = planForDay(selectedDay);
    if (hasSupabase) {
      if (existingPlan) {
        await supabase.from('training_plans').update({ name: form.name, type: form.type }).eq('id', existingPlan.id);
        await supabase.from('exercises').delete().eq('plan_id', existingPlan.id);
        if (validExercises.length > 0) {
          await supabase.from('exercises').insert(validExercises.map((ex, i) => ({
            plan_id: existingPlan.id, name: ex.name, sets: parseInt(ex.sets) || 3,
            reps: ex.reps, load: ex.load || '', rest: ex.rest,
            video_url: ex.videoUrl || '', obs: ex.obs || '', order_index: i,
          })));
        }
        const { data: updated } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', existingPlan.id).single();
        if (updated) setPlans(prev => prev.map(p => p.id === existingPlan.id ? updated : p));
      } else {
        const { data: plan } = await supabase.from('training_plans').insert({
          personal_id: user.id, student_id: student?.id, student_name: student?.name,
          name: form.name, type: form.type, days: [selectedDay],
        }).select().single();
        if (plan) {
          if (validExercises.length > 0) {
            await supabase.from('exercises').insert(validExercises.map((ex, i) => ({
              plan_id: plan.id, name: ex.name, sets: parseInt(ex.sets) || 3,
              reps: ex.reps, load: ex.load || '', rest: ex.rest,
              video_url: ex.videoUrl || '', obs: ex.obs || '', order_index: i,
            })));
          }
          const { data: full } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', plan.id).single();
          if (full) setPlans(prev => [full, ...prev]);
        }
      }
    } else {
      if (existingPlan) {
        setPlans(prev => prev.map(p => p.id === existingPlan.id ? { ...p, name: form.name, type: form.type, exercises: validExercises } : p));
      } else {
        setPlans(prev => [{ id: Date.now(), student_id: selectedStudentId, student_name: student?.name, name: form.name, type: form.type, days: [selectedDay], exercises: validExercises, created_at: new Date().toISOString() }, ...prev]);
      }
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDeleteDay = async () => {
    const plan = planForDay(selectedDay);
    if (!plan) return;
    if (hasSupabase) await supabase.from('training_plans').delete().eq('id', plan.id);
    setPlans(prev => prev.filter(p => p.id !== plan.id));
    setForm({ name: '', type: 'Hipertrofia', exercises: [] });
    setDeleteConfirm(false);
    setSaved(false);
  };

  const dayInfo = DAYS.find(d => d.value === selectedDay);
  const groupColor = GROUP_COLORS[selectedGroup] || '#3B82F6';
  const libraryExercises = EXERCISE_DB[selectedGroup] || [];

  if (loadingData) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, flex: 1 }}>
      <Loader size={28} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="page-padding" style={{ flex: 1, position: 'relative' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Treinos</h2>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: '#9CA3AF' }}>Monte o treino semanal de cada aluno</p>
      </div>

      {/* Student dropdown */}
      <div style={{ background: 'white', borderRadius: 14, padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1px solid #F1F5F9', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        {selectedStudentObj ? (
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: selectedStudentObj.color || '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'white', flexShrink: 0 }}>
            {selectedStudentObj.initials || selectedStudentObj.name?.slice(0, 2).toUpperCase()}
          </div>
        ) : (
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Dumbbell size={15} color="#9CA3AF" />
          </div>
        )}
        <select value={selectedStudentId} onChange={e => { setSelectedStudentId(e.target.value); setSelectedDay(null); }}
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 15, fontWeight: 600, color: selectedStudentId ? '#111827' : '#9CA3AF', outline: 'none', cursor: 'pointer', appearance: 'none', paddingRight: 20, boxShadow: 'none' }}>
          <option value="">Selecione um aluno...</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <ChevronDown size={15} color="#9CA3AF" style={{ flexShrink: 0, pointerEvents: 'none', marginLeft: -20 }} />
      </div>

      {!selectedStudentId ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 14, border: '1px solid #F1F5F9' }}>
          <Dumbbell size={38} color="#E5E7EB" style={{ marginBottom: 10 }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#9CA3AF' }}>Selecione um aluno para montar a semana de treinos</p>
        </div>
      ) : (
        <>
          {/* Week strip */}
          <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1px solid #F1F5F9', marginBottom: 14 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Semana de Treinos</p>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
              {DAYS.map(day => {
                const plan = planForDay(day.value);
                const isSelected = selectedDay === day.value;
                const gc = plan ? (GROUP_COLORS[plan.name] || '#8B5CF6') : null;
                const exCount = (plan?.exercises || []).length;
                return (
                  <button key={day.value} onClick={() => openDay(day.value)}
                    style={{ flex: '0 0 auto', width: 74, padding: '11px 6px 9px', borderRadius: 12, cursor: 'pointer', border: `2px solid ${isSelected ? '#3B82F6' : plan ? gc + '30' : '#E5E7EB'}`, background: isSelected ? '#EFF6FF' : plan ? gc + '0D' : '#F9FAFB', textAlign: 'center', transition: 'all 0.12s', boxShadow: isSelected ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: isSelected ? '#3B82F6' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{day.label}</p>
                    {plan ? (
                      <>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: gc + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
                          <Dumbbell size={14} color={gc} />
                        </div>
                        <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: gc, lineHeight: 1.3 }}>{plan.name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 9, color: '#9CA3AF' }}>{exCount} ex.</p>
                      </>
                    ) : (
                      <>
                        <div style={{ width: 28, height: 28, borderRadius: 8, border: '1.5px dashed #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
                          <Plus size={12} color="#9CA3AF" />
                        </div>
                        <p style={{ margin: 0, fontSize: 9, color: '#C4C4C4' }}>Vazio</p>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day editor */}
          {selectedDay !== null && (
            <div className="treinos-day-panel" style={{ background: '#F8FAFC', borderRadius: 14, border: '1px solid #F1F5F9', overflow: 'hidden', position: 'sticky', top: 16 }}>
              {/* Header */}
              <div style={{ background: 'white', padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setSelectedDay(null)} style={{ width: 30, height: 30, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ArrowLeft size={15} color="#374151" />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 10, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{dayInfo?.full}</p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: groupColor }}>{form.name || 'Novo treino'}</p>
                </div>
                {planForDay(selectedDay) && (
                  deleteConfirm ? (
                    <button onClick={handleDeleteDay} style={{ padding: '5px 12px', background: '#EF4444', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>Confirmar</button>
                  ) : (
                    <button onClick={() => setDeleteConfirm(true)} style={{ width: 30, height: 30, borderRadius: '50%', background: '#FEF2F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Trash2 size={13} color="#EF4444" />
                    </button>
                  )
                )}
                <button onClick={handleSave} disabled={saving || !form.name}
                  style={{ padding: '7px 14px', background: saved ? '#10B981' : groupColor, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, opacity: saving || !form.name ? 0.6 : 1, transition: 'background 0.2s' }}>
                  {saving ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <Check size={12} /> : <Save size={12} />}
                  {saving ? 'Salvando' : saved ? 'Salvo!' : 'Salvar'}
                </button>
              </div>

              {/* Scrollable content */}
              <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 280px)', padding: 16 }}>

                {/* Group tabs */}
                <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 16, background: 'white', borderRadius: 10, border: '1px solid #F1F5F9', padding: 4 }}>
                  {GROUPS.filter(g => g !== 'Descanso').map(g => (
                    <button key={g} type="button" onClick={() => handleGroupSelect(g)}
                      style={{ flex: '0 0 auto', padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: selectedGroup === g ? 700 : 500, background: selectedGroup === g ? groupColor : 'transparent', color: selectedGroup === g ? 'white' : '#6B7280', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                      {g}
                    </button>
                  ))}
                  <button type="button" onClick={() => handleGroupSelect('Descanso')}
                    style={{ flex: '0 0 auto', padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: selectedGroup === 'Descanso' ? 700 : 500, background: selectedGroup === 'Descanso' ? '#9CA3AF' : 'transparent', color: selectedGroup === 'Descanso' ? 'white' : '#6B7280', whiteSpace: 'nowrap' }}>
                    Descanso
                  </button>
                </div>

                {selectedGroup !== 'Descanso' && (
                  <>
                    {/* Exercise library */}
                    {libraryExercises.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Exercícios — {selectedGroup}
                          </p>
                          <span style={{ fontSize: 11, color: '#9CA3AF' }}>Clique para adicionar</span>
                        </div>
                        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #F1F5F9', overflow: 'hidden' }}>
                          {libraryExercises.map((libEx, i) => {
                            const isAdded = form.exercises.some(ex => ex.name === libEx.name);
                            return (
                              <div key={libEx.name}
                                style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: i < libraryExercises.length - 1 ? '1px solid #F9FAFB' : 'none', background: isAdded ? groupColor + '08' : 'white', transition: 'background 0.12s', cursor: 'pointer', gap: 10 }}
                                onClick={() => toggleExercise(libEx)}>
                                <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isAdded ? groupColor : '#E5E7EB'}`, background: isAdded ? groupColor : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s' }}>
                                  {isAdded && <Check size={12} color="white" strokeWidth={3} />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ margin: 0, fontSize: 13, fontWeight: isAdded ? 700 : 500, color: isAdded ? '#111827' : '#374151' }}>{libEx.name}</p>
                                  <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>{libEx.sets} séries · {libEx.reps} · {libEx.rest}</p>
                                </div>
                                <a href={libEx.video} target="_blank" rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 6, background: '#FEF3C7', color: '#D97706', textDecoration: 'none', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                  <Play size={10} fill="#D97706" /> Ver
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Selected exercises */}
                    {form.exercises.length > 0 && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Treino montado ({form.exercises.length} exercícios)
                          </p>
                          <button type="button" onClick={addCustomExercise}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: groupColor, background: 'none', border: `1px dashed ${groupColor}`, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontWeight: 700 }}>
                            <Plus size={11} /> Personalizado
                          </button>
                        </div>
                        {form.exercises.map((ex, i) => (
                          <ExerciseRow key={i} ex={ex} index={i} total={form.exercises.length}
                            onChange={handleExerciseChange} onMove={moveExercise} groupColor={groupColor} />
                        ))}
                      </div>
                    )}

                    {form.exercises.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '16px 0', color: '#9CA3AF', fontSize: 13 }}>
                        Clique nos exercícios acima para adicioná-los ao treino
                      </div>
                    )}
                  </>
                )}

                {selectedGroup === 'Descanso' && (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <p style={{ margin: 0, fontSize: 14, color: '#6B7280', fontWeight: 600 }}>Dia de descanso</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9CA3AF' }}>Nenhum exercício neste dia</p>
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
