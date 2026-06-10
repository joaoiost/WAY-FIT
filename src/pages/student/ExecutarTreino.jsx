import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, Clock, Dumbbell, X, Play, Star, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const TYPE_COLORS = {
  Hipertrofia: '#8B5CF6', Funcional: '#10B981', Força: '#EF4444',
  Cardio: '#F59E0B', Resistência: '#3B82F6', Mobilidade: '#06B6D4',
};

const FEELINGS = [
  { value: 'otimo', label: 'Ótimo', emoji: '💪' },
  { value: 'bem', label: 'Bem', emoji: '😊' },
  { value: 'regular', label: 'Regular', emoji: '😐' },
  { value: 'cansado', label: 'Cansado', emoji: '😓' },
  { value: 'mal', label: 'Mal', emoji: '😩' },
];

function parseRestSeconds(rest) {
  if (!rest) return 60;
  const s = String(rest).toLowerCase().trim();
  if (s.includes('min')) return parseInt(s) * 60;
  if (s.includes(':')) {
    const [m, sec] = s.split(':').map(Number);
    return m * 60 + (sec || 0);
  }
  const n = parseInt(s);
  return isNaN(n) ? 60 : n;
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return m ? m[1] : null;
}

function VideoModal({ videoUrl, title, onClose }) {
  const id = getYouTubeId(videoUrl);
  const searchUrl = videoUrl?.includes('results') ? videoUrl : `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' execução correta')}`;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 680, background: '#000', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#111' }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Demonstração</p>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 15 }}>{title}</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', padding: 8, borderRadius: 8 }}>
            <X size={18} />
          </button>
        </div>
        {id ? (
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
            <iframe src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`} title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} />
          </div>
        ) : (
          <div style={{ padding: '40px 24px', textAlign: 'center', background: '#0A0A0A' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Play size={26} color="rgba(255,255,255,0.25)" />
            </div>
            <p style={{ margin: '0 0 6px', color: 'white', fontWeight: 700, fontSize: 15 }}>{title}</p>
            <p style={{ margin: '0 0 24px', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Nenhum vídeo vinculado. Busque no YouTube:</p>
            <a href={searchUrl} target="_blank" rel="noopener noreferrer"
              style={{ background: '#EF4444', color: 'white', padding: '12px 28px', borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Play size={15} fill="white" /> Buscar no YouTube
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function RatingModal({ plan, studentId, personalId, onClose, onSaved }) {
  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [feeling, setFeeling] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    if (!stars) return;
    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    if (hasSupabase && studentId && personalId) {
      await supabase.from('session_ratings').upsert({
        student_id: studentId, personal_id: personalId,
        date: today, rating: stars, feeling, notes,
      }, { onConflict: 'student_id,date' });
    }
    setSaving(false);
    setDone(true);
    setTimeout(() => { onSaved(); onClose(); }, 1000);
  };

  if (done) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 40, textAlign: 'center', maxWidth: 320, width: '100%' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Check size={28} color="#10B981" strokeWidth={3} />
        </div>
        <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800 }}>Avaliação salva!</h3>
        <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>Seu personal poderá ver como foi</p>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '24px 20px 32px', width: '100%', maxWidth: 500 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E5E7EB', margin: '0 auto 20px' }} />
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>Como foi o treino?</h3>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6B7280' }}>{plan?.name}</p>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setStars(n)} onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <Star size={36} fill={(hovered || stars) >= n ? '#F59E0B' : 'none'} color={(hovered || stars) >= n ? '#F59E0B' : '#D1D5DB'} strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {FEELINGS.map(f => (
            <button key={f.value} onClick={() => setFeeling(f.value)}
              style={{ padding: '8px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: feeling === f.value ? '#EFF6FF' : '#F3F4F6', color: feeling === f.value ? '#3B82F6' : '#6B7280', outline: feeling === f.value ? '2px solid #3B82F6' : '2px solid transparent' }}>
              {f.emoji} {f.label}
            </button>
          ))}
        </div>

        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações opcionais..." rows={2}
          style={{ width: '100%', resize: 'none', padding: '10px 12px', fontSize: 13, borderRadius: 10, border: '1.5px solid #E5E7EB', outline: 'none', marginBottom: 16, boxSizing: 'border-box' }} />

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid #E5E7EB', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
            Pular
          </button>
          <button onClick={handleSave} disabled={!stars || saving}
            style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: stars ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)' : '#E5E7EB', color: stars ? 'white' : '#9CA3AF', fontSize: 14, fontWeight: 700, cursor: stars ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Salvando...' : 'Salvar avaliação'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExecutarTreino() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [plan, setPlan] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [studentRecord, setStudentRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [setsData, setSetsData] = useState({});
  const [lastLoads, setLastLoads] = useState({});
  const [loadHistory, setLoadHistory] = useState({}); // { exId: [{load, done, date}] }

  const [restTimer, setRestTimer] = useState(null);
  const restRef = useRef(null);
  const sessionIdRef = useRef(null);
  const setsDataRef = useRef({});
  setsDataRef.current = setsData;

  const [finished, setFinished] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratedToday, setRatedToday] = useState(false);
  const [videoModal, setVideoModal] = useState(false);

  // Save indicator: 'idle' | 'saving' | 'saved' | 'error'
  const [saveStatus, setSaveStatus] = useState('idle');
  const saveTimerRef = useRef(null);

  const todayDate = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!user || !planId) return;
    if (!hasSupabase) { setLoading(false); return; }

    (async () => {
      const { data: student } = await supabase
        .from('students').select('id, personal_id').eq('user_id', user.id).maybeSingle();
      if (!student) { navigate('/aluno/treinos'); return; }
      setStudentRecord(student);

      const [{ data: p }, { data: existingSession }, { data: lastLogRows }, { data: rating }] = await Promise.all([
        supabase.from('training_plans').select('*, exercises(*)').eq('id', planId).single(),
        supabase.from('workout_sessions')
          .select('id, exercise_logs(exercise_id, done, sets_data, load_actual)')
          .eq('student_id', student.id).eq('plan_id', planId).eq('date', todayDate).maybeSingle(),
        supabase.from('exercise_logs').select('exercise_id, load_actual, done, created_at')
          .eq('student_id', student.id).not('load_actual', 'is', null)
          .order('created_at', { ascending: false }).limit(500),
        supabase.from('session_ratings').select('id').eq('student_id', student.id).eq('date', todayDate).maybeSingle(),
      ]);

      if (!p) { navigate('/aluno/treinos'); return; }

      const exs = [...(p.exercises || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      setPlan(p);
      setExercises(exs);
      setRatedToday(!!rating);

      const hints = {};
      const hist = {};
      (lastLogRows || []).forEach(log => {
        if (!hints[log.exercise_id]) hints[log.exercise_id] = log.load_actual;
        if (!hist[log.exercise_id]) hist[log.exercise_id] = [];
        if (hist[log.exercise_id].length < 5) {
          hist[log.exercise_id].push({ load: log.load_actual, done: log.done, date: log.created_at });
        }
      });
      setLastLoads(hints);
      setLoadHistory(hist);

      const initSets = {};
      if (existingSession) {
        sessionIdRef.current = existingSession.id;
        (existingSession.exercise_logs || []).forEach(log => {
          if (log.sets_data && log.sets_data.length > 0) initSets[log.exercise_id] = log.sets_data;
        });
      }

      exs.forEach(ex => {
        if (!initSets[ex.id]) {
          const hint = hints[ex.id];
          const defaultLoad = hint || ex.load || '';
          const numSets = parseInt(ex.sets) || 3;
          initSets[ex.id] = Array.from({ length: numSets }, () => ({ load: defaultLoad, done: false }));
        }
      });
      setSetsData(initSets);
      setsDataRef.current = initSets;

      if (existingSession) {
        const doneExIds = new Set((existingSession.exercise_logs || []).filter(l => l.done).map(l => l.exercise_id));
        const firstIncomplete = exs.findIndex(ex => !doneExIds.has(ex.id));
        if (firstIncomplete > 0) setCurrentIdx(firstIncomplete);
      }

      setLoading(false);
    })();
  }, [user?.id, planId]);

  useEffect(() => {
    if (restTimer === null) return;
    if (restTimer <= 0) { setRestTimer(null); return; }
    restRef.current = setTimeout(() => setRestTimer(t => t - 1), 1000);
    return () => clearTimeout(restRef.current);
  }, [restTimer]);

  const setSaveIndicator = (status) => {
    clearTimeout(saveTimerRef.current);
    setSaveStatus(status);
    if (status === 'saved') saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    if (status === 'error') saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
  };

  const getOrCreateSession = async (student, p, exs) => {
    if (sessionIdRef.current) return sessionIdRef.current;
    try {
      const { data: session } = await supabase.from('workout_sessions').upsert({
        student_id: student.id,
        personal_id: student.personal_id,
        plan_id: p.id,
        plan_name: p.name,
        plan_type: p.type,
        date: todayDate,
        exercises_total: exs.length,
        exercises_done: 0,
      }, { onConflict: 'student_id,plan_id,date' }).select('id').single();
      if (session) { sessionIdRef.current = session.id; return session.id; }
    } catch {}
    return null;
  };

  const saveExerciseWithSets = async (exIdx, exId, sets) => {
    if (!hasSupabase || !studentRecord || !plan) return;
    const ex = exercises[exIdx];
    if (!ex) return;

    setSaveIndicator('saving');
    try {
      const sid = await getOrCreateSession(studentRecord, plan, exercises);
      if (!sid) throw new Error('no session');

      const doneCount = sets.filter(s => s.done).length;
      const allDone = doneCount === sets.length && sets.length > 0;
      const loads = sets.filter(s => s.load).map(s => s.load);
      const representativeLoad = loads[loads.length - 1] || null;

      await supabase.from('exercise_logs').upsert({
        session_id: sid,
        student_id: studentRecord.id,
        exercise_id: exId,
        exercise_name: ex.name,
        sets_planned: ex.sets,
        reps_planned: ex.reps,
        load_planned: ex.load || null,
        load_actual: representativeLoad,
        sets_data: sets,
        done: allDone,
      }, { onConflict: 'session_id,exercise_id' });

      const allExsDone = exercises.filter((e, i) => {
        if (e.id === exId) return allDone;
        const s = setsDataRef.current[e.id] || [];
        return s.length > 0 && s.every(set => set.done);
      });
      await supabase.from('workout_sessions').update({
        exercises_done: allExsDone.length,
        finished_at: allExsDone.length === exercises.length ? new Date().toISOString() : null,
      }).eq('id', sid);

      setSaveIndicator('saved');
    } catch {
      setSaveIndicator('error');
    }
  };

  const confirmSet = (setIdx) => {
    const ex = exercises[currentIdx];
    if (!ex) return;
    const currentSets = setsData[ex.id] || [];
    const isConfirming = !currentSets[setIdx]?.done;
    const isLastSet = setIdx === currentSets.length - 1;

    const newSets = [...currentSets];
    newSets[setIdx] = { ...newSets[setIdx], done: !newSets[setIdx].done };

    setSetsData(prev => ({ ...prev, [ex.id]: newSets }));
    setsDataRef.current = { ...setsDataRef.current, [ex.id]: newSets };

    if (isConfirming && !isLastSet) {
      const secs = parseRestSeconds(ex.rest);
      if (secs > 0) setRestTimer(secs);
    }

    saveExerciseWithSets(currentIdx, ex.id, newSets);
  };

  const updateSetLoad = (setIdx, value) => {
    const ex = exercises[currentIdx];
    if (!ex) return;
    setSetsData(prev => {
      const curr = [...(prev[ex.id] || [])];
      curr[setIdx] = { ...curr[setIdx], load: value };
      const updated = { ...prev, [ex.id]: curr };
      setsDataRef.current = updated;
      return updated;
    });
  };

  const goNext = async () => {
    const ex = exercises[currentIdx];
    if (ex) await saveExerciseWithSets(currentIdx, ex.id, setsDataRef.current[ex.id] || []);
    setRestTimer(null);
    setVideoModal(false);
    if (currentIdx < exercises.length - 1) {
      setCurrentIdx(i => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setFinished(true);
    }
  };

  const goPrev = () => {
    setRestTimer(null);
    if (currentIdx > 0) {
      setCurrentIdx(i => i - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleQuit = async () => {
    const ex = exercises[currentIdx];
    if (ex) await saveExerciseWithSets(currentIdx, ex.id, setsDataRef.current[ex.id] || []);
    navigate('/aluno/treinos');
  };

  // ── Loading ──────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
      <Dumbbell size={36} color="#3B82F6" />
      <p style={{ margin: 0, fontSize: 14, color: '#6B7280' }}>Carregando treino...</p>
    </div>
  );

  // ── Finished ─────────────────────────────────────────
  if (finished) {
    const totalSets = exercises.reduce((acc, ex) => acc + (setsDataRef.current[ex.id] || []).length, 0);
    const doneSets = exercises.reduce((acc, ex) => acc + (setsDataRef.current[ex.id] || []).filter(s => s.done).length, 0);
    return (
      <>
        <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0F172A 0%, #1E3A5F 60%, #0F172A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center', color: 'white', maxWidth: 380, width: '100%' }}>
            <div style={{ fontSize: 80, marginBottom: 16, lineHeight: 1 }}>🏆</div>
            <h1 style={{ fontSize: 30, fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.5px' }}>Treino concluído!</h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', margin: '0 0 36px' }}>{plan?.name}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 36 }}>
              {[
                { label: 'Exercícios', value: exercises.length },
                { label: 'Séries feitas', value: `${doneSets}/${totalSets}` },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '18px 12px', backdropFilter: 'blur(4px)' }}>
                  <p style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>{s.value}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {!ratedToday && (
              <button
                onClick={() => setShowRating(true)}
                style={{ width: '100%', padding: '16px', borderRadius: 14, background: 'linear-gradient(135deg, #F59E0B, #EF4444)', border: 'none', color: 'white', fontSize: 16, fontWeight: 800, cursor: 'pointer', marginBottom: 12, letterSpacing: '-0.3px' }}
              >
                ⭐ Avaliar sessão
              </button>
            )}

            <button
              onClick={() => navigate('/aluno/treinos')}
              style={{ width: '100%', padding: ratedToday ? '16px' : '14px', borderRadius: 14, background: ratedToday ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)' : 'rgba(255,255,255,0.1)', border: ratedToday ? 'none' : '1px solid rgba(255,255,255,0.15)', color: 'white', fontSize: ratedToday ? 16 : 14, fontWeight: ratedToday ? 800 : 600, cursor: 'pointer', marginBottom: 10 }}
            >
              Ver meus treinos
            </button>
            <button
              onClick={() => navigate('/aluno/historico')}
              style={{ width: '100%', padding: '12px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Ver histórico
            </button>
          </div>
        </div>

        {showRating && (
          <RatingModal
            plan={plan}
            studentId={studentRecord?.id}
            personalId={studentRecord?.personal_id}
            onClose={() => setShowRating(false)}
            onSaved={() => setRatedToday(true)}
          />
        )}
      </>
    );
  }

  // ── Execution screen ──────────────────────────────────
  const ex = exercises[currentIdx];
  if (!ex) return null;

  const sets = setsData[ex.id] || [];
  const doneCount = sets.filter(s => s.done).length;
  const allSetsDone = doneCount === sets.length && sets.length > 0;
  const color = TYPE_COLORS[plan?.type] || '#6B7280';
  const pct = (currentIdx / exercises.length) * 100;
  const hasVideo = !!(ex.video_url && (getYouTubeId(ex.video_url) || ex.video_url.includes('youtube.com')));
  const isLastExercise = currentIdx === exercises.length - 1;

  // Superset context
  const ssGroup = ex.superset_group || null;
  const ssColor = ssGroup ? ({ A:'#3B82F6', B:'#10B981', C:'#8B5CF6', D:'#F59E0B', E:'#EF4444' }[ssGroup] || '#6B7280') : null;
  const ssExercises = ssGroup ? exercises.filter(e => e.superset_group === ssGroup) : [];
  const ssPositionInGroup = ssGroup ? ssExercises.findIndex(e => e.id === ex.id) + 1 : 0;
  const nextEx = exercises[currentIdx + 1] || null;
  const nextInSameSuperset = ssGroup && nextEx?.superset_group === ssGroup;

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', display: 'flex', flexDirection: 'column' }}>

      {/* Sticky header */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 56, padding: '0 16px' }}>
          <button onClick={handleQuit} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', color: '#6B7280', flexShrink: 0 }}>
            <ChevronLeft size={22} />
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#111827' }}>
              {currentIdx + 1}/{exercises.length}
              {saveStatus === 'saving' && <span style={{ fontSize: 10, color: '#9CA3AF', marginLeft: 6 }}>● sincronizando</span>}
              {saveStatus === 'saved' && <span style={{ fontSize: 10, color: '#10B981', marginLeft: 6 }}>✓ salvo</span>}
              {saveStatus === 'error' && <span style={{ fontSize: 10, color: '#EF4444', marginLeft: 6 }}>⚠ sem conexão</span>}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan?.name}</p>
          </div>
          <button onClick={handleQuit} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', color: '#9CA3AF', flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ height: 3, background: '#E5E7EB' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}, #3B82F6)`, transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '16px 16px 0', maxWidth: 560, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Exercise header */}
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          {/* Superset banner */}
          {ssGroup && (
            <div style={{ background: ssColor, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: 'white', letterSpacing: '0.08em' }}>
                ⚡ SUPERSET {ssGroup} — {ssPositionInGroup} de {ssExercises.length}
              </span>
              {nextInSameSuperset && (
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', marginLeft: 'auto' }}>
                  próximo: {nextEx.name.split(' ').slice(0, 2).join(' ')}
                </span>
              )}
            </div>
          )}
          <div style={{ padding: '18px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: `${(ssColor || color)}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Dumbbell size={22} color={ssColor || color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: ssColor || color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{plan?.type}</span>
              <h2 style={{ margin: '2px 0 4px', fontSize: 19, fontWeight: 900, color: '#111827', lineHeight: 1.2 }}>{ex.name}</h2>
              <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>
                {ex.sets} séries · {ex.reps} reps
                {ex.load ? ` · ${ex.load}` : ''}
                {ex.rest ? ` · ${ex.rest} desc.` : ''}
              </p>
            </div>
          </div>

          {/* Thumbnail YouTube inline — toca para reproduzir sem sair do app */}
          {hasVideo && (() => {
            const ytId = getYouTubeId(ex.video_url);
            if (ytId) return (
              <div onClick={() => setVideoModal(true)} style={{ margin: '12px 0 0', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', position: 'relative', background: '#000', lineHeight: 0 }}>
                <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={ex.name} style={{ width: '100%', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.22)' }}>
                  <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                    <Play size={22} color="white" fill="white" style={{ marginLeft: 3 }} />
                  </div>
                </div>
                <div style={{ position: 'absolute', bottom: 8, right: 10, background: 'rgba(0,0,0,0.65)', borderRadius: 6, padding: '3px 8px' }}>
                  <span style={{ fontSize: 10, color: 'white', fontWeight: 800, letterSpacing: '0.06em' }}>DEMONSTRAÇÃO</span>
                </div>
              </div>
            );
            return (
              <button onClick={() => setVideoModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#EFF6FF', color: '#3B82F6', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', margin: '10px 0 0', width: '100%', justifyContent: 'center' }}>
                <Play size={14} fill="#3B82F6" /> Ver demonstração
              </button>
            );
          })()}

          {ex.obs && (
            <div style={{ marginTop: 12, background: '#FFFBEB', borderRadius: 8, padding: '8px 12px', border: '1px solid #FDE68A', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>💡</span>
              <p style={{ margin: 0, fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>{ex.obs}</p>
            </div>
          )}
          {videoModal && <VideoModal videoUrl={ex.video_url} title={ex.name} onClose={() => setVideoModal(false)} />}
          </div>{/* /padding wrapper */}
        </div>{/* /exercise card */}

        {/* Rest timer */}
        {restTimer !== null && (
          <div style={{ background: 'linear-gradient(135deg, #0F172A, #1E3A5F)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(96,165,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={20} color="#60A5FA" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Descanso</p>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: 'white', lineHeight: 1.1 }}>{formatTime(restTimer)}</p>
            </div>
            <button onClick={() => setRestTimer(null)}
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '8px 14px', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              Pular
            </button>
          </div>
        )}

        {/* Sets */}
        <div style={{ background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#111827' }}>Séries</p>
            <span style={{ fontSize: 13, fontWeight: 700, color: allSetsDone ? '#10B981' : '#6B7280' }}>
              {doneCount}/{sets.length} feitas
            </span>
          </div>

          {/* Sugestão de carga progressiva inteligente */}
          {(() => {
            const lastRaw = lastLoads[ex.id];
            const last = parseFloat(lastRaw);
            if (!lastRaw || isNaN(last)) return null;

            const hist = loadHistory[ex.id] || [];
            const lastWasDone = hist[0]?.done !== false;
            const stableCount = hist.filter(h => parseFloat(h.load) === last).length;
            const shouldIncrease = lastWasDone && stableCount >= 2;

            const sug = Math.round((last + 2.5) * 4) / 4;
            const sugStr = sug % 1 === 0 ? String(sug) : sug.toFixed(1);
            const allPending = sets.every(s => !s.done);

            const applySuggestion = (load) => {
              setSetsData(prev => ({
                ...prev,
                [ex.id]: (prev[ex.id] || []).map(s => s.done ? s : { ...s, load }),
              }));
            };

            const bg = shouldIncrease
              ? 'linear-gradient(135deg,#ECFDF5,#D1FAE5)'
              : lastWasDone ? 'linear-gradient(135deg,#EFF6FF,#F5F3FF)' : '#FFFBEB';
            const borderColor = shouldIncrease ? '#86EFAC' : lastWasDone ? '#BFDBFE' : '#FDE68A';
            const iconColor = shouldIncrease ? '#10B981' : lastWasDone ? '#3B82F6' : '#D97706';

            const message = shouldIncrease
              ? `Carga estável há ${stableCount}x — hora de progredir!`
              : lastWasDone
                ? `Boa execução na última sessão`
                : `Última sessão incompleta — mantenha o peso`;

            return (
              <div style={{ padding: '10px 12px', background: bg, borderRadius: 10, marginBottom: 14, border: `1px solid ${borderColor}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <TrendingUp size={15} color={iconColor} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 1px', fontSize: 11, fontWeight: 700, color: iconColor }}>{message}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>
                        Última: <strong style={{ color: '#374151' }}>{lastRaw}kg</strong>
                      </p>
                      {shouldIncrease && (
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#059669' }}>
                          Sugestão: {sugStr}kg <span style={{ fontSize: 11, color: '#10B981' }}>↑ +2,5kg</span>
                        </p>
                      )}
                    </div>
                    {hist.length > 1 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                        {hist.slice(0, 4).reverse().map((h, i) => (
                          <span key={i} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: h.done ? '#D1FAE5' : '#FEE2E2', color: h.done ? '#059669' : '#DC2626', fontWeight: 700 }}>
                            {h.load}kg
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {allPending && (
                    <button onClick={() => applySuggestion(shouldIncrease ? sugStr : lastRaw)}
                      style={{ padding: '7px 12px', background: iconColor, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      Usar
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sets.map((set, si) => (
              <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: set.done ? '#F0FDF4' : '#F9FAFB', border: `1.5px solid ${set.done ? '#86EFAC' : '#E5E7EB'}`, transition: 'all 0.2s' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: set.done ? '#10B981' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: set.done ? 'white' : '#6B7280' }}>{si + 1}</span>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={set.load}
                  onChange={e => updateSetLoad(si, e.target.value)}
                  placeholder={lastLoads[ex.id] ? `Última: ${lastLoads[ex.id]}` : (ex.load || 'kg')}
                  style={{ flex: 1, maxWidth: 130, padding: '8px 10px', fontSize: 15, fontWeight: 700, borderRadius: 8, border: '1.5px solid #E5E7EB', outline: 'none', background: 'white', color: '#111827', textAlign: 'center' }}
                  onClick={e => e.stopPropagation()}
                />
                <span style={{ fontSize: 12, color: '#9CA3AF', flexShrink: 0, minWidth: 48, textAlign: 'center' }}>{ex.reps} reps</span>
                <button onClick={() => confirmSet(si)}
                  style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', border: 'none', background: set.done ? '#10B981' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                  <Check size={18} color={set.done ? 'white' : '#9CA3AF'} strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Exercise mini-map */}
        <div style={{ background: 'white', borderRadius: 14, padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Exercícios</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {exercises.map((e, i) => {
              const exSets = setsData[e.id] || [];
              const exAllDone = exSets.length > 0 && exSets.every(s => s.done);
              const isCurrent = i === currentIdx;
              return (
                <button key={e.id}
                  onClick={() => { saveExerciseWithSets(currentIdx, exercises[currentIdx]?.id, setsDataRef.current[exercises[currentIdx]?.id] || []); setCurrentIdx(i); setRestTimer(null); }}
                  style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 800, background: isCurrent ? color : exAllDone ? '#D1FAE5' : '#F3F4F6', color: isCurrent ? 'white' : exAllDone ? '#10B981' : '#6B7280', transition: 'all 0.15s', outline: isCurrent ? `2px solid ${color}` : 'none', outlineOffset: 2 }}>
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ height: 100 }} />
      </div>

      {/* Bottom nav */}
      <div style={{ padding: '12px 16px', background: 'white', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10, position: 'sticky', bottom: 0, zIndex: 20 }}>
        <button onClick={goPrev} disabled={currentIdx === 0}
          style={{ flex: 1, padding: '14px', borderRadius: 12, border: '1.5px solid #E5E7EB', background: 'white', fontSize: 14, fontWeight: 700, color: '#374151', cursor: currentIdx === 0 ? 'not-allowed' : 'pointer', opacity: currentIdx === 0 ? 0.35 : 1 }}>
          ← Anterior
        </button>
        <button onClick={goNext}
          style={{ flex: 2.5, padding: '14px', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer', background: allSetsDone ? 'linear-gradient(135deg, #10B981, #059669)' : `linear-gradient(135deg, ${color}, #3B82F6)`, color: 'white', transition: 'background 0.3s', letterSpacing: '-0.2px' }}>
          {isLastExercise ? (allSetsDone ? '🏁 Concluir treino' : 'Encerrar treino') : (allSetsDone ? '✓ Próximo →' : 'Próximo →')}
        </button>
      </div>
    </div>
  );
}
