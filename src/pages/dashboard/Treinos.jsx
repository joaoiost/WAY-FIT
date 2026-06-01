import { useState, useEffect } from 'react';
import { Plus, Dumbbell, Trash2, X, Video, Play, Loader, Save, ChevronDown, ChevronUp, Check, Copy, BookOpen, ArrowLeft } from 'lucide-react';
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

const GROUPS = [
  { label: 'Peito',     emoji: '🫁', color: '#EF4444', bg: '#FEF2F2', type: 'Hipertrofia',
    suggestions: ['Supino Reto', 'Supino Inclinado', 'Supino Declinado', 'Crucifixo', 'Pec Deck', 'Crossover'] },
  { label: 'Costas',    emoji: '🔙', color: '#3B82F6', bg: '#EFF6FF', type: 'Hipertrofia',
    suggestions: ['Puxada Frontal', 'Remada Curvada', 'Remada Unilateral', 'Pull-up', 'Levantamento Terra', 'Serrote'] },
  { label: 'Pernas',    emoji: '🦵', color: '#8B5CF6', bg: '#F5F3FF', type: 'Hipertrofia',
    suggestions: ['Agachamento', 'Leg Press', 'Extensora', 'Flexora', 'Adutora', 'Afundo', 'Panturrilha'] },
  { label: 'Ombro',     emoji: '🏋️', color: '#F59E0B', bg: '#FFFBEB', type: 'Hipertrofia',
    suggestions: ['Desenvolvimento', 'Elevação Lateral', 'Elevação Frontal', 'Encolhimento', 'Voador Invertido'] },
  { label: 'Braços',    emoji: '💪', color: '#10B981', bg: '#ECFDF5', type: 'Hipertrofia',
    suggestions: ['Rosca Direta', 'Rosca Scott', 'Rosca Martelo', 'Tríceps Pulley', 'Tríceps Testa', 'Tríceps Francês'] },
  { label: 'Abdômen',   emoji: '🎯', color: '#06B6D4', bg: '#ECFEFF', type: 'Funcional',
    suggestions: ['Crunch', 'Prancha', 'Elevação de Pernas', 'Abdominal Oblíquo', 'Bicicleta'] },
  { label: 'Full Body', emoji: '⚡', color: '#EC4899', bg: '#FDF2F8', type: 'Funcional',
    suggestions: ['Burpee', 'Agachamento com Salto', 'Flexão', 'Mountain Climber', 'Kettlebell Swing'] },
  { label: 'Cardio',    emoji: '🏃', color: '#F97316', bg: '#FFF7ED', type: 'Cardio',
    suggestions: ['Esteira', 'Bicicleta Ergométrica', 'Elíptico', 'Corda', 'HIIT'] },
  { label: 'Descanso',  emoji: '😴', color: '#9CA3AF', bg: '#F9FAFB', type: 'Mobilidade',
    suggestions: [] },
];

const REPS_PRESETS = ['6', '8', '10', '12', '15', '20', 'Falha'];
const REST_PRESETS = ['30s', '45s', '60s', '90s', '2min'];

function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return m ? m[1] : null;
}

function VideoModal({ videoUrl, title, onClose }) {
  const id = getYouTubeId(videoUrl);
  return (
    <div className="video-modal-backdrop" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 760, background: '#000', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#111' }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}><X size={22} /></button>
        </div>
        {id ? (
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
            <iframe src={`https://www.youtube.com/embed/${id}?autoplay=1`} title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} />
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>URL inválida</div>
        )}
      </div>
    </div>
  );
}

function ExerciseRow({ ex, index, total, onChange, onMove, onDuplicate, groupColor }) {
  const [open, setOpen] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const sets = parseInt(ex.sets) || 3;
  const gc = groupColor || '#3B82F6';

  return (
    <div style={{ background: 'white', borderRadius: 12, marginBottom: 8, border: `1px solid ${open ? gc + '30' : '#F1F5F9'}`, overflow: 'hidden', transition: 'border-color 0.15s' }}>
      {/* Collapsed row */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '11px 14px', gap: 10 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: gc + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: gc, flexShrink: 0 }}>
          {index + 1}
        </div>

        <input
          value={ex.name}
          onChange={e => onChange(index, 'name', e.target.value)}
          placeholder="Nome do exercício..."
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: '#111827', padding: 0, outline: 'none', minWidth: 0, boxShadow: 'none' }}
        />

        {/* Sets inline stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F9FAFB', borderRadius: 20, padding: '3px 10px', border: '1px solid #E5E7EB', flexShrink: 0 }}>
          <button type="button" onClick={e => { e.stopPropagation(); onChange(index, 'sets', Math.max(1, sets - 1)); }}
            style={{ width: 18, height: 18, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, color: '#6B7280', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#111827', minWidth: 16, textAlign: 'center' }}>{sets}</span>
          <button type="button" onClick={e => { e.stopPropagation(); onChange(index, 'sets', sets + 1); }}
            style={{ width: 18, height: 18, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, color: '#6B7280', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, marginLeft: 2 }}>×</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', minWidth: 28 }}>{ex.reps || '12'}</span>
        </div>

        <button type="button" onClick={() => setOpen(p => !p)}
          style={{ padding: 3, background: 'none', border: 'none', cursor: 'pointer', color: open ? gc : '#C4C4C4', display: 'flex', flexShrink: 0, transition: 'color 0.15s' }}>
          <ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>

      {/* Sub-line: load + rest preview when collapsed */}
      {!open && (ex.load || (ex.rest && ex.rest !== '60s')) && (
        <div style={{ padding: '0 14px 10px', paddingLeft: 48 }}>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>
            {[ex.load ? `${ex.load} kg` : null, ex.rest || null].filter(Boolean).join(' · ')}
          </span>
        </div>
      )}

      {/* Expanded panel */}
      {open && (
        <div style={{ borderTop: '1px solid #F9FAFB', padding: '14px 14px 14px' }}>
          {/* Reps */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: '0 0 7px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Repetições</p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
              {REPS_PRESETS.map(r => (
                <button key={r} type="button" onClick={() => onChange(index, 'reps', r)}
                  style={{ padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.1s', border: `1.5px solid ${ex.reps === r ? gc : '#E5E7EB'}`, background: ex.reps === r ? gc + '15' : '#F9FAFB', color: ex.reps === r ? gc : '#6B7280' }}>
                  {r}
                </button>
              ))}
              <input value={REPS_PRESETS.includes(ex.reps) ? '' : (ex.reps || '')} onChange={e => onChange(index, 'reps', e.target.value)}
                placeholder="outro" style={{ width: 58, fontSize: 12, textAlign: 'center', padding: '5px 6px' }} />
            </div>
          </div>

          {/* Load + Rest */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <p style={{ margin: '0 0 7px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Carga</p>
              <div style={{ position: 'relative' }}>
                <input value={ex.load || ''} onChange={e => onChange(index, 'load', e.target.value)} placeholder="—"
                  style={{ width: '100%', textAlign: 'center', fontWeight: 700, paddingRight: 26 }} />
                <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#9CA3AF', pointerEvents: 'none' }}>kg</span>
              </div>
            </div>
            <div>
              <p style={{ margin: '0 0 7px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Descanso</p>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {REST_PRESETS.map(r => (
                  <button key={r} type="button" onClick={() => onChange(index, 'rest', r)}
                    style={{ padding: '5px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${ex.rest === r ? gc : '#E5E7EB'}`, background: ex.rest === r ? gc + '15' : '#F9FAFB', color: ex.rest === r ? gc : '#6B7280' }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Obs / Video */}
          <button type="button" onClick={() => setShowExtra(p => !p)}
            style={{ fontSize: 11, color: (ex.obs || ex.videoUrl) ? gc : '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, marginBottom: showExtra ? 8 : 0 }}>
            <ChevronDown size={11} style={{ transform: showExtra ? 'rotate(180deg)' : 'none', transition: '0.15s' }} />
            {(ex.obs || ex.videoUrl) ? 'Obs / vídeo adicionado' : 'Adicionar obs / vídeo'}
          </button>
          {showExtra && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <input placeholder="Observação..." value={ex.obs || ''} onChange={e => onChange(index, 'obs', e.target.value)} style={{ fontSize: 12 }} />
              <div style={{ position: 'relative' }}>
                <Video size={11} color="#EF4444" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
                <input placeholder="URL YouTube..." value={ex.videoUrl || ''} onChange={e => onChange(index, 'videoUrl', e.target.value)} style={{ fontSize: 12, paddingLeft: 24 }} />
              </div>
            </div>
          )}

          {/* Actions row */}
          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0}
              style={{ padding: '5px 12px', fontSize: 12, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, cursor: index === 0 ? 'not-allowed' : 'pointer', color: index === 0 ? '#D1D5DB' : '#374151', fontWeight: 600 }}>
              ↑ Subir
            </button>
            <button type="button" onClick={() => onMove(index, 1)} disabled={index === total - 1}
              style={{ padding: '5px 12px', fontSize: 12, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, cursor: index === total - 1 ? 'not-allowed' : 'pointer', color: index === total - 1 ? '#D1D5DB' : '#374151', fontWeight: 600 }}>
              ↓ Descer
            </button>
            <button type="button" onClick={() => onDuplicate(index)}
              style={{ padding: '5px 12px', fontSize: 12, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', color: '#374151', fontWeight: 600 }}>
              Duplicar
            </button>
            <button type="button" onClick={() => onChange(index, 'delete')}
              style={{ padding: '5px 12px', fontSize: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, cursor: 'pointer', color: '#EF4444', fontWeight: 600, marginLeft: 'auto' }}>
              Remover
            </button>
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
  const [form, setForm] = useState({ name: '', type: 'Hipertrofia', exercises: [] });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [videoModal, setVideoModal] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
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

  const templates = plans.filter(p => !p.student_id && !p.studentId);
  const studentPlans = plans.filter(p => String(p.student_id || p.studentId) === String(selectedStudentId));
  const planForDay = (day) => studentPlans.find(p => (p.days || []).includes(day));
  const selectedGroup = GROUPS.find(g => g.label === form.name) || null;

  const openDay = (day) => {
    setSelectedDay(day);
    setDeleteConfirm(false);
    setSaved(false);
    const plan = planForDay(day);
    if (plan) {
      setForm({
        name: plan.name, type: plan.type,
        exercises: (plan.exercises || [])
          .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
          .map(ex => ({ ...ex, videoUrl: ex.video_url || '', load: ex.load || '' })),
      });
    } else {
      setForm({ name: '', type: 'Hipertrofia', exercises: [] });
    }
  };

  const handleGroupSelect = (group) => setForm(f => ({ ...f, name: group.label, type: group.type }));

  const handleExerciseChange = (index, field, value) => {
    if (field === 'delete') {
      setForm(f => ({ ...f, exercises: f.exercises.filter((_, i) => i !== index) }));
    } else {
      setForm(f => { const exs = [...f.exercises]; exs[index] = { ...exs[index], [field]: value }; return { ...f, exercises: exs }; });
    }
  };

  const addExercise = () => setForm(f => ({ ...f, exercises: [...f.exercises, { name: '', sets: 3, reps: '12', load: '', rest: '60s', videoUrl: '', obs: '' }] }));

  const duplicateExercise = (index) => {
    setForm(f => {
      const exs = [...f.exercises];
      exs.splice(index + 1, 0, { ...exs[index] });
      return { ...f, exercises: exs };
    });
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

  const handleSave = async () => {
    if (!selectedStudentId || selectedDay === null || !form.name) return;
    const student = students.find(s => String(s.id) === String(selectedStudentId));
    const validExercises = form.exercises.filter(ex => ex.name.trim());
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

  const applyTemplate = (tmpl) => {
    const group = GROUPS.find(g => g.label === tmpl.name);
    setForm({
      name: tmpl.name,
      type: tmpl.type || group?.type || 'Hipertrofia',
      exercises: (tmpl.exercises || [])
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map(ex => ({ name: ex.name, sets: ex.sets, reps: ex.reps, load: ex.load || '', rest: ex.rest || '60s', videoUrl: ex.video_url || '', obs: ex.obs || '' })),
    });
    setShowTemplates(false);
  };

  const handleSaveTemplate = async () => {
    if (!form.name) return;
    const validExercises = form.exercises.filter(ex => ex.name.trim());
    if (hasSupabase) {
      const { data: plan } = await supabase.from('training_plans').insert({
        personal_id: user.id, student_id: null, student_name: null, name: form.name, type: form.type, days: [],
      }).select().single();
      if (plan) {
        if (validExercises.length > 0) {
          await supabase.from('exercises').insert(validExercises.map((ex, i) => ({
            plan_id: plan.id, name: ex.name, sets: parseInt(ex.sets) || 3,
            reps: ex.reps, load: ex.load || '', rest: ex.rest, video_url: ex.videoUrl || '', obs: ex.obs || '', order_index: i,
          })));
        }
        const { data: full } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', plan.id).single();
        if (full) setPlans(prev => [...prev, full]);
      }
    } else {
      setPlans(prev => [...prev, { id: Date.now(), student_id: null, name: form.name, type: form.type, days: [], exercises: validExercises }]);
    }
    setTemplateSaved(true);
    setTimeout(() => setTemplateSaved(false), 2500);
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
  const groupColor = selectedGroup?.color || '#3B82F6';
  const suggestions = selectedGroup?.suggestions || [];
  const selectedStudent = students.find(s => String(s.id) === selectedStudentId);

  if (loadingData) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, flex: 1 }}>
      <Loader size={28} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="page-padding" style={{ flex: 1, position: 'relative' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Treinos</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6B7280' }}>Monte o treino semanal de cada aluno</p>
      </div>

      {/* Student dropdown */}
      <div style={{ background: 'white', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        {selectedStudent && (
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: selectedStudent.color || '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white', flexShrink: 0 }}>
            {selectedStudent.initials || selectedStudent.name?.slice(0, 2).toUpperCase()}
          </div>
        )}
        {!selectedStudent && (
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Dumbbell size={16} color="#9CA3AF" />
          </div>
        )}
        <select
          value={selectedStudentId}
          onChange={e => { setSelectedStudentId(e.target.value); setSelectedDay(null); }}
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 15, fontWeight: 600, color: selectedStudentId ? '#111827' : '#9CA3AF', outline: 'none', cursor: 'pointer', appearance: 'none', paddingRight: 20 }}
        >
          <option value="">Selecione um aluno...</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <ChevronDown size={16} color="#9CA3AF" style={{ flexShrink: 0, pointerEvents: 'none', marginLeft: -20 }} />
      </div>

      {!selectedStudentId ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <Dumbbell size={40} color="#E5E7EB" style={{ marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#9CA3AF' }}>Selecione um aluno para montar a semana de treinos</p>
        </div>
      ) : (
        <>
          {/* Week strip */}
          <div style={{ background: 'white', borderRadius: 14, padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 16 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Semana de treinos</p>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
              {DAYS.map(day => {
                const plan = planForDay(day.value);
                const group = plan ? GROUPS.find(g => g.label === plan.name) : null;
                const isSelected = selectedDay === day.value;
                const exCount = (plan?.exercises || []).length;
                return (
                  <button
                    key={day.value}
                    onClick={() => openDay(day.value)}
                    style={{
                      flex: '0 0 auto', width: 76, padding: '12px 6px 10px', borderRadius: 14, cursor: 'pointer',
                      border: `2px solid ${isSelected ? '#3B82F6' : plan ? (group?.color || '#8B5CF6') + '35' : '#E5E7EB'}`,
                      background: isSelected ? '#EFF6FF' : plan ? (group?.bg || '#F5F3FF') : '#F9FAFB',
                      textAlign: 'center', transition: 'all 0.15s',
                      boxShadow: isSelected ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none',
                    }}
                  >
                    <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: isSelected ? '#3B82F6' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{day.label}</p>
                    {plan ? (
                      <>
                        <span style={{ fontSize: 22 }}>{group?.emoji || '💪'}</span>
                        <p style={{ margin: '4px 0 0', fontSize: 10, fontWeight: 700, color: group?.color || '#8B5CF6', lineHeight: 1.3 }}>{plan.name}</p>
                        <p style={{ margin: '3px 0 0', fontSize: 9, color: '#9CA3AF' }}>{exCount} ex.</p>
                      </>
                    ) : (
                      <>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', border: '2px dashed #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
                          <Plus size={12} color="#9CA3AF" />
                        </div>
                        <p style={{ margin: 0, fontSize: 9, color: '#C4C4C4' }}>Vazio</p>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Week summary chips */}
            {studentPlans.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #F3F4F6', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {studentPlans.map(p => {
                  const g = GROUPS.find(g => g.label === p.name);
                  return (
                    <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: g?.bg || '#F3F4F6', color: g?.color || '#6B7280', fontSize: 11, fontWeight: 600 }}>
                      {g?.emoji} {p.name} <span style={{ fontWeight: 400, opacity: 0.7 }}>({(p.exercises || []).length})</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Day editor overlay */}
          {selectedDay !== null && (
            <div className="treinos-day-panel" style={{
              background: '#F8FAFC', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              overflow: 'hidden', position: 'sticky', top: 16,
            }}>
              {/* Editor header */}
              <div style={{ background: 'white', padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <button onClick={() => setSelectedDay(null)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ArrowLeft size={16} color="#374151" />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>{dayInfo?.full}</p>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: selectedGroup?.color || '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedGroup ? `${selectedGroup.emoji} ${form.name}` : 'Novo treino'}
                  </p>
                </div>
                {planForDay(selectedDay) && (
                  deleteConfirm ? (
                    <button onClick={handleDeleteDay} style={{ padding: '6px 12px', background: '#EF4444', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                      Confirmar
                    </button>
                  ) : (
                    <button onClick={() => setDeleteConfirm(true)} style={{ width: 32, height: 32, borderRadius: '50%', background: '#FEF2F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Trash2 size={14} color="#EF4444" />
                    </button>
                  )
                )}
                <button onClick={handleSave} disabled={saving || !form.name}
                  style={{ padding: '8px 16px', background: saved ? '#10B981' : groupColor, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, opacity: (!form.name || saving) ? 0.6 : 1, transition: 'background 0.2s' }}>
                  {saving ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <Check size={13} /> : <Save size={13} />}
                  {saving ? 'Salvando' : saved ? 'Salvo!' : 'Salvar'}
                </button>
              </div>

              {/* Scrollable content */}
              <div style={{ padding: '16px', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>

                {/* Template picker */}
                {templates.length > 0 && (
                  <div style={{ marginBottom: 14, position: 'relative' }}>
                    <button type="button" onClick={() => setShowTemplates(s => !s)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1.5px dashed #8B5CF6', background: '#F5F3FF', color: '#8B5CF6', cursor: 'pointer', fontSize: 12, fontWeight: 700, width: '100%', justifyContent: 'center' }}>
                      <BookOpen size={13} /> Usar template ({templates.length}) <ChevronDown size={11} />
                    </button>
                    {showTemplates && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 60, overflow: 'hidden', marginTop: 4 }}>
                        {templates.map(tmpl => {
                          const g = GROUPS.find(g => g.label === tmpl.name);
                          return (
                            <button key={tmpl.id} type="button" onClick={() => applyTemplate(tmpl)}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #F9FAFB' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                              <span style={{ fontSize: 18 }}>{g?.emoji || '💪'}</span>
                              <div>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#374151' }}>{tmpl.name}</p>
                                <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>{(tmpl.exercises || []).length} exercícios</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Group chips */}
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Grupo muscular</p>
                <div style={{ display: 'flex', gap: 7, overflowX: 'auto', marginBottom: 18, paddingBottom: 4, scrollbarWidth: 'none' }}>
                  {GROUPS.map(g => (
                    <button key={g.label} type="button" onClick={() => handleGroupSelect(g)}
                      style={{
                        flex: '0 0 auto', padding: '7px 13px', borderRadius: 22, cursor: 'pointer',
                        border: `2px solid ${form.name === g.label ? g.color : 'transparent'}`,
                        background: form.name === g.label ? g.bg : '#F1F5F9',
                        color: form.name === g.label ? g.color : '#6B7280',
                        fontSize: 13, fontWeight: 700, transition: 'all 0.12s', whiteSpace: 'nowrap',
                      }}>
                      {g.emoji} {g.label}
                    </button>
                  ))}
                </div>

                {form.name && (
                  <>
                    {/* Quick-add chips */}
                    {suggestions.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Adicionar rápido</p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {suggestions.map(s => {
                            const already = form.exercises.some(ex => ex.name === s);
                            return (
                              <button key={s} type="button"
                                onClick={() => {
                                  if (already) return;
                                  setForm(f => ({ ...f, exercises: [...f.exercises, { name: s, sets: 3, reps: '12', load: '', rest: '60s', videoUrl: '', obs: '' }] }));
                                }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 20, cursor: already ? 'default' : 'pointer',
                                  border: `1.5px solid ${already ? groupColor : '#E5E7EB'}`,
                                  background: already ? (selectedGroup?.bg || '#EFF6FF') : 'white',
                                  color: already ? groupColor : '#374151',
                                  fontSize: 12, fontWeight: 600, transition: 'all 0.12s', opacity: already ? 0.75 : 1,
                                }}>
                                {already && <Check size={10} />} {s}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Exercise list */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#374151' }}>
                        {form.exercises.length > 0 ? `${form.exercises.length} exercício${form.exercises.length !== 1 ? 's' : ''}` : 'Nenhum exercício'}
                      </p>
                      <button type="button" onClick={addExercise}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: `1.5px dashed ${groupColor}`, color: groupColor, borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                        <Plus size={12} /> Personalizado
                      </button>
                    </div>

                    {form.exercises.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        {form.exercises.map((ex, i) => (
                          <ExerciseRow key={i} ex={ex} index={i} total={form.exercises.length}
                            onChange={handleExerciseChange} onMove={moveExercise} onDuplicate={duplicateExercise} groupColor={groupColor} />
                        ))}
                      </div>
                    )}

                    {/* Save as template */}
                    <button type="button" onClick={handleSaveTemplate} disabled={!form.name}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', background: templateSaved ? '#ECFDF5' : '#F5F3FF', color: templateSaved ? '#10B981' : '#8B5CF6', border: `1px solid ${templateSaved ? '#6EE7B7' : '#DDD6FE'}`, borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 12, transition: 'all 0.2s' }}>
                      {templateSaved ? <><Check size={13} /> Template salvo!</> : <><Copy size={13} /> Salvar como template</>}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {videoModal && <VideoModal videoUrl={videoModal.video_url || videoModal.videoUrl} title={videoModal.name} onClose={() => setVideoModal(null)} />}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} div[style*="scrollbar-width: none"]::-webkit-scrollbar{display:none}`}</style>
    </div>
  );
}
