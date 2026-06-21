import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, ChevronDown, ChevronUp, Play, X, Star, Loader, CheckCircle, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { trainingPlans } from '../../data/mockData';
import { fetchExerciseVideo } from '../../lib/youtubeVideo';

const TYPE_COLORS = {
  Hipertrofia: '#8B5CF6', Funcional: '#10B981', Força: '#EF4444',
  Cardio: '#F59E0B', Resistência: '#3B82F6', Mobilidade: '#06B6D4',
};

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const FEELINGS = [
  { value: 'otimo', label: 'Ótimo', emoji: '💪' },
  { value: 'bem', label: 'Bem', emoji: '😊' },
  { value: 'regular', label: 'Regular', emoji: '😐' },
  { value: 'cansado', label: 'Cansado', emoji: '😓' },
  { value: 'mal', label: 'Mal', emoji: '😩' },
];

function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return m ? m[1] : null;
}

function VideoModal({ videoUrl, title, onClose }) {
  const id = getYouTubeId(videoUrl);
  return (
    <div className="video-modal-backdrop" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 720, background: '#000', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#111' }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
        </div>
        {id ? (
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
            <iframe src={`https://www.youtube.com/embed/${id}?autoplay=1`} title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} />
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Loader size={28} color="rgba(255,255,255,0.3)" style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite' }} />
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Carregando demonstração...</p>
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
    setTimeout(() => { onSaved(); onClose(); }, 1200);
  };

  if (done) return (
    <div className="modal-overlay">
      <div style={{ background: 'white', borderRadius: 20, padding: 40, textAlign: 'center', maxWidth: 340, width: '100%' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <CheckCircle size={32} color="#10B981" />
        </div>
        <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#111827' }}>Treino registrado!</h3>
        <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>Seu personal poderá ver como foi a sessão</p>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F3F4F6' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>Como foi o treino?</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>{plan.name}</p>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#374151' }}>Avalie a sessão</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setStars(n)} onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                  <Star size={36} fill={(hovered || stars) >= n ? '#F59E0B' : 'none'} color={(hovered || stars) >= n ? '#F59E0B' : '#D1D5DB'} strokeWidth={1.5} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#374151' }}>Como você se sentiu?</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {FEELINGS.map(f => (
                <button key={f.value} onClick={() => setFeeling(f.value)}
                  style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: feeling === f.value ? '#EFF6FF' : '#F3F4F6', color: feeling === f.value ? '#3B82F6' : '#6B7280', outline: feeling === f.value ? '2px solid #3B82F6' : '2px solid transparent', transition: 'all 0.15s' }}>
                  {f.emoji} {f.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Observações (opcional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Como foi a intensidade, alguma dor, algum exercício difícil..." rows={2} style={{ resize: 'vertical', fontSize: 13 }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Pular</button>
            <button onClick={handleSave} disabled={!stars || saving} className="btn-primary"
              style={{ flex: 1, justifyContent: 'center', opacity: (!stars || saving) ? 0.6 : 1 }}>
              {saving ? 'Salvando...' : 'Salvar avaliação'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MeusTreinos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [studentRecord, setStudentRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [videoModal, setVideoModal] = useState(null);
  // Read-only: loaded from DB, not interactive
  const [doneMap, setDoneMap] = useState({});      // { exId: boolean }
  const [sessionInfoMap, setSessionInfoMap] = useState({}); // { planId: { exercises_done } }
  const [ratingModal, setRatingModal] = useState(null);
  const [ratedToday, setRatedToday] = useState(false);
  const [autoVideoUrls, setAutoVideoUrls] = useState({});

  const today = new Date().getDay();
  const todayLabel = DAYS_FULL[today];
  const todayDate = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!user) return;
    if (hasSupabase) {
      (async () => {
        const { data: student } = await supabase
          .from('students').select('id, personal_id').eq('user_id', user.id).maybeSingle();

        if (student) {
          setStudentRecord(student);
          const [{ data: p }, { data: todaySessions }, { data: rating }] = await Promise.all([
            supabase.from('training_plans').select('*, exercises(*)').eq('student_id', student.id).order('created_at', { ascending: false }),
            supabase.from('workout_sessions')
              .select('id, plan_id, exercises_done, exercises_total, exercise_logs(exercise_id, done)')
              .eq('student_id', student.id).eq('date', todayDate),
            supabase.from('session_ratings').select('id').eq('student_id', student.id).eq('date', todayDate).maybeSingle(),
          ]);

          setPlans(p || []);
          setRatedToday(!!rating);

          const newSessionInfo = {};
          const newDoneMap = {};
          (todaySessions || []).forEach(session => {
            newSessionInfo[session.plan_id] = { exercises_done: session.exercises_done || 0 };
            (session.exercise_logs || []).forEach(log => {
              if (log.done) newDoneMap[log.exercise_id] = true;
            });
          });
          setSessionInfoMap(newSessionInfo);
          setDoneMap(newDoneMap);
        } else {
          setPlans([]);
        }
        setLoading(false);
      })();
    } else {
      setPlans(trainingPlans.filter(p => p.studentId === 1));
      setLoading(false);
    }
  }, [user?.id]);

  const getExercises = (plan) => {
    const exs = plan.exercises || [];
    return [...exs].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  };

  const getVideoUrl = (ex) => ex.video_url || ex.videoUrl || autoVideoUrls[ex.id] || '';

  // Auto-fetch YouTube videos when a plan is expanded
  useEffect(() => {
    if (!expanded) return;
    const plan = plans.find(p => p.id === expanded);
    if (!plan) return;
    getExercises(plan).forEach(ex => {
      if (ex.video_url || ex.videoUrl || autoVideoUrls[ex.id] !== undefined) return;
      setAutoVideoUrls(prev => ({ ...prev, [ex.id]: null }));
      fetchExerciseVideo(ex.name, ex.video_search).then(url => {
        setAutoVideoUrls(prev => ({ ...prev, [ex.id]: url }));
      });
    });
  }, [expanded, plans]);
  const getPlanDays = (plan) => plan.days || [];
  const isTodayPlan = (plan) => { const days = getPlanDays(plan); return days.length > 0 && days.includes(today); };

  const todayPlan = plans.find(isTodayPlan);
  const otherPlans = plans.filter(p => !isTodayPlan(p));

  const getDoneCount = (plan) => getExercises(plan).filter(ex => doneMap[ex.id]).length;
  const isAllDone = (plan) => { const exs = getExercises(plan); return exs.length > 0 && getDoneCount(plan) === exs.length; };

  const generatePDF = (plan) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const exercises = getExercises(plan);
    const days = getPlanDays(plan).map(d => DAYS_FULL[d]).join(', ') || '—';
    const color = [59, 130, 246]; // blue

    // Header
    doc.setFillColor(...color);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('WAY FIT', 14, 12);
    doc.setFontSize(13);
    doc.text(plan.name || 'Plano de Treino', 14, 21);

    doc.setTextColor(180, 210, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${plan.type || ''} · ${days} · ${exercises.length} exercícios`, 14, 26.5);

    // Student name + date
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 196, 35, { align: 'right' });

    // Exercise table
    autoTable(doc, {
      startY: 36,
      head: [['#', 'Exercício', 'Séries', 'Reps', 'Carga', 'Descanso', 'Observações']],
      body: exercises.map((ex, i) => [
        i + 1,
        ex.name || '—',
        ex.sets || '—',
        ex.reps || '—',
        ex.load ? `${ex.load} kg` : '—',
        ex.rest ? `${ex.rest}s` : '—',
        ex.obs || '',
      ]),
      headStyles: { fillColor: color, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      columnStyles: { 0: { cellWidth: 8 }, 6: { cellWidth: 35 } },
      margin: { left: 14, right: 14 },
    });

    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text('Gerado pelo WAY FIT — seu app de treino personalizado', 105, finalY, { align: 'center' });

    doc.save(`treino_${(plan.name || 'plano').replace(/\s+/g, '_').toLowerCase()}.pdf`);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
      <Loader size={28} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const renderPlan = (plan, highlight = false) => {
    const isOpen = expanded === plan.id;
    const exercises = getExercises(plan);
    const doneCount = getDoneCount(plan);
    const allDone = isAllDone(plan);
    const hasSession = !!sessionInfoMap[plan.id];
    const color = TYPE_COLORS[plan.type] || '#6B7280';
    const planDays = getPlanDays(plan);

    const ctaLabel = allDone ? null : hasSession && doneCount > 0 ? 'Continuar Treino' : 'Iniciar Treino';

    return (
      <div
        key={plan.id}
        style={{
          background: 'white', borderRadius: 14, overflow: 'hidden',
          boxShadow: highlight ? '0 4px 20px rgba(59,130,246,0.15)' : '0 1px 3px rgba(0,0,0,0.08)',
          border: highlight ? '2px solid #3B82F6' : '2px solid transparent',
        }}
      >
        {highlight && (
          <div style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', padding: '8px 18px' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>⚡ TREINO DE HOJE — {todayLabel.toUpperCase()}</span>
          </div>
        )}

        <button
          onClick={() => setExpanded(isOpen ? null : plan.id)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Dumbbell size={20} color={color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
              <span style={{ background: `${color}20`, color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{plan.type}</span>
              {planDays.map(d => (
                <span key={d} style={{ background: '#F3F4F6', color: '#6B7280', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20 }}>{DAYS_PT[d]}</span>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.name}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>
              {exercises.length} exercícios
              {doneCount > 0 ? ` · ${doneCount}/${exercises.length} feitos hoje` : ''}
            </p>
          </div>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            {allDone && <CheckCircle size={20} color="#10B981" />}
            {doneCount > 0 && !allDone && (
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#3B82F6' }}>
                {Math.round((doneCount / exercises.length) * 100)}%
              </div>
            )}
            <button onClick={e => { e.stopPropagation(); generatePDF(plan); }}
              title="Baixar PDF do treino"
              style={{ width: 34, height: 34, borderRadius: 9, background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={16} color="#6B7280" />
            </button>
            {isOpen ? <ChevronUp size={18} color="#9CA3AF" /> : <ChevronDown size={18} color="#9CA3AF" />}
          </div>
        </button>

        {doneCount > 0 && (
          <div style={{ height: 3, background: '#E5E7EB', margin: '0 18px' }}>
            <div style={{ height: '100%', width: `${(doneCount / exercises.length) * 100}%`, background: allDone ? 'linear-gradient(90deg, #10B981, #059669)' : 'linear-gradient(90deg, #3B82F6, #8B5CF6)', borderRadius: 2, transition: 'width 0.4s' }} />
          </div>
        )}

        {/* CTA collapsed — only for today's plan */}
        {highlight && !isOpen && !allDone && (
          <div style={{ padding: '0 18px 14px' }}>
            <button
              onClick={() => navigate(`/aluno/treinos/${plan.id}/executar`)}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Play size={15} fill="white" /> {ctaLabel}
            </button>
          </div>
        )}

        {isOpen && (
          <div style={{ padding: '0 18px 18px', borderTop: '1px solid #F3F4F6' }}>

            {/* CTA inside expanded card */}
            {!allDone && (
              <div style={{ paddingTop: 14, marginBottom: 4 }}>
                <button
                  onClick={() => navigate(`/aluno/treinos/${plan.id}/executar`)}
                  style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <Play size={14} fill="white" /> {ctaLabel || 'Iniciar Treino'}
                </button>
              </div>
            )}

            {/* Read-only exercise list */}
            <div style={{ paddingTop: allDone ? 14 : 10 }}>
              {exercises.map((ex, i) => {
                const done = !!doneMap[ex.id];
                const videoUrl = getVideoUrl(ex);
                const hasVideo = !!getYouTubeId(videoUrl);
                const videoLoading = !ex.video_url && !ex.videoUrl && autoVideoUrls[ex.id] === null;
                return (
                  <div key={ex.id} style={{ padding: '11px 0', borderBottom: i < exercises.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      {/* Read-only status indicator */}
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: done ? '#D1FAE5' : '#F3F4F6', border: `2px solid ${done ? '#10B981' : '#E5E7EB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        {done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: done ? 400 : 600, color: done ? '#9CA3AF' : '#111827', textDecoration: done ? 'line-through' : 'none' }}>
                          {ex.name}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>
                          {ex.sets}x · {ex.reps} reps{ex.load ? ` · ${ex.load}` : ''}{ex.rest ? ` · ${ex.rest} desc.` : ''}
                        </p>
                        {ex.obs && <p style={{ margin: '3px 0 0', fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>💡 {ex.obs}</p>}
                      </div>
                      {videoLoading && (
                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#9CA3AF' }}>
                          <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        </div>
                      )}
                      {hasVideo && (
                        <button className="video-btn" onClick={() => setVideoModal(ex)} style={{ flexShrink: 0 }}>
                          <Play size={10} /> Vídeo
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {allDone && (
              <div style={{ marginTop: 16, padding: '14px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #A7F3D0', textAlign: 'center' }}>
                <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#065F46' }}>🎉 Treino concluído!</p>
                {!ratedToday ? (
                  <button
                    onClick={() => setRatingModal(plan)}
                    style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    ⭐ Avaliar sessão
                  </button>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: '#10B981', fontWeight: 600 }}>✓ Avaliação registrada hoje</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page-padding" style={{ flex: 1 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--gray-900)' }}>Meus Treinos</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--gray-400)' }}>{plans.length} planos cadastrados pelo seu personal</p>
      </div>

      {plans.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 12, padding: 60, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <Dumbbell size={48} color="#D1D5DB" style={{ marginBottom: 16 }} />
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#374151' }}>Nenhum treino ainda</p>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#9CA3AF' }}>Aguarde seu personal cadastrar seus treinos</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {todayPlan && renderPlan(todayPlan, true)}
          {!todayPlan && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>📅</span>
              <p style={{ margin: 0, fontSize: 13, color: '#92400E' }}>
                <strong>Hoje ({todayLabel})</strong> não há treino programado. Descanse ou faça uma atividade leve!
              </p>
            </div>
          )}
          {otherPlans.length > 0 && (
            <>
              {todayPlan && <p style={{ margin: '8px 0 4px', fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Outros planos</p>}
              {otherPlans.map(p => renderPlan(p, false))}
            </>
          )}
        </div>
      )}

      {videoModal && (
        <VideoModal
          videoUrl={videoModal.video_url || videoModal.videoUrl || autoVideoUrls[videoModal.id] || ''}
          title={videoModal.name}
          onClose={() => setVideoModal(null)}
        />
      )}

      {ratingModal && (
        <RatingModal
          plan={ratingModal}
          studentId={studentRecord?.id}
          personalId={studentRecord?.personal_id}
          onClose={() => setRatingModal(null)}
          onSaved={() => setRatedToday(true)}
        />
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
