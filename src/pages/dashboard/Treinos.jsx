import { useState, useEffect } from 'react';
import { Plus, Dumbbell, Trash2, X, Play, Loader, Save, Check, ChevronDown, Copy, HelpCircle, ChevronRight, ExternalLink, BookMarked, FolderOpen, Lightbulb, User, Calendar, Zap } from 'lucide-react';
import { trainingPlans as mockPlans, students as mockStudents } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { searchExercises } from '../../data/exerciseLibrary';
import { fetchExerciseImage } from '../../lib/exerciseImages';
import { fetchExerciseVideo } from '../../lib/youtubeVideo';

const DAYS = [
  { value: 1, label: 'Seg', full: 'Segunda-feira' },
  { value: 2, label: 'Ter', full: 'Terça-feira' },
  { value: 3, label: 'Qua', full: 'Quarta-feira' },
  { value: 4, label: 'Qui', full: 'Quinta-feira' },
  { value: 5, label: 'Sex', full: 'Sexta-feira' },
  { value: 6, label: 'Sáb', full: 'Sábado' },
  { value: 0, label: 'Dom', full: 'Domingo' },
];

const GROUPS = ['Peito','Costas','Pernas','Glúteos','Ombro','Braços','Abdômen','Full Body','Cardio','Descanso'];
const GROUP_COLORS = {
  Peito:'#EF4444', Costas:'#3B82F6', Pernas:'#8B5CF6', Glúteos:'#EC4899',
  Ombro:'#F59E0B', Braços:'#10B981', Abdômen:'#06B6D4',
  'Full Body':'#F97316', Cardio:'#6366F1', Descanso:'#9CA3AF',
};
const PLAN_TYPES = ['Hipertrofia','Força','Resistência','Funcional','Cardio','Mobilidade','Emagrecimento'];
const REPS_QUICK = ['6','8','10','12','15','20','Falha'];
const REST_QUICK = ['30s','45s','60s','75s','90s','2min'];
const SUPERSET_LETTERS = ['A','B','C','D','E'];
const SUPERSET_COLORS = { A:'#3B82F6', B:'#10B981', C:'#8B5CF6', D:'#F59E0B', E:'#EF4444' };
const FREQ_PRESETS = {
  3: { days: [1,3,5], groups: ['Peito','Costas','Pernas'] },
  4: { days: [1,2,4,5], groups: ['Peito','Costas','Pernas','Ombro'] },
  5: { days: [1,2,3,4,5], groups: ['Peito','Costas','Pernas','Ombro','Braços'] },
  6: { days: [1,2,3,4,5,6], groups: ['Peito','Costas','Pernas','Ombro','Braços','Full Body'] },
};

const TUTORIAL_STEPS = [
  { Icon: User,     color: '#3B82F6', bg: '#EFF6FF', title: 'Selecione um aluno', desc: 'Escolha para qual aluno você está montando o programa. Cada aluno tem sua própria semana de treinos.' },
  { Icon: Calendar, color: '#8B5CF6', bg: '#F5F3FF', title: 'Configure a semana', desc: 'Clique em "Configurar semana" e defina quantos dias por semana o aluno treina e quais grupos musculares.' },
  { Icon: Dumbbell, color: '#10B981', bg: '#ECFDF5', title: 'Adicione os exercícios', desc: 'Clique em qualquer dia para abrir o editor. Digite o nome — o autocomplete vai sugerir. Configure séries, reps e carga.' },
  { Icon: Copy,     color: '#F59E0B', bg: '#FFFBEB', title: 'Copie para outros alunos', desc: 'Montou um programa que funcionou? Use "Copiar para..." para duplicar todos os treinos para outro aluno em segundos.' },
];

/* ─── ExerciseCard ──────────────────────────────────────────── */
function ExerciseCard({ ex, index, total, onUpdate, onDelete, onMove, accentColor, autoOpen, supersetLetters }) {
  const [open, setOpen] = useState(autoOpen || !ex.name);
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const [exerciseImg, setExerciseImg] = useState(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [videoFetching, setVideoFetching] = useState(false);

  // Auto-busca imagem quando nome do exercício muda
  useEffect(() => {
    if (!ex.name || ex.name.length < 3) { setExerciseImg(null); return; }
    setImgLoading(true);
    fetchExerciseImage(ex.name)
      .then(url => { setExerciseImg(url); setImgLoading(false); })
      .catch(() => setImgLoading(false));
  }, [ex.name]);
  const sets = parseInt(ex.sets) || 3;
  const ac = accentColor || '#3B82F6';
  const isCustomReps = ex.reps && !REPS_QUICK.includes(ex.reps);
  const ssColor = ex.supersetGroup ? (SUPERSET_COLORS[ex.supersetGroup] || '#6B7280') : null;

  const handleNameChange = (val) => {
    onUpdate('name', val);
    const s = searchExercises(val);
    setSuggestions(s);
    setShowSugg(s.length > 0);
  };

  const selectSuggestion = (s) => {
    onUpdate('name', s.name);
    setSuggestions([]);
    setShowSugg(false);
    // Busca vídeo automaticamente — sempre busca ao selecionar (substitui URL de busca por URL direta)
    const jaTemVideoReal = ex.videoUrl && (ex.videoUrl.includes('watch?v=') || ex.videoUrl.includes('youtu.be'));
    if (!jaTemVideoReal) {
      setVideoFetching(true);
      fetchExerciseVideo(s.name, s.videoSearch).then(url => {
        setVideoFetching(false);
        if (url) onUpdate('videoUrl', url);
        else if (s.videoSearch) onUpdate('videoUrl', `https://www.youtube.com/results?search_query=${encodeURIComponent(s.videoSearch)}`);
      }).catch(() => {
        setVideoFetching(false);
        if (s.videoSearch) onUpdate('videoUrl', `https://www.youtube.com/results?search_query=${encodeURIComponent(s.videoSearch)}`);
      });
    }
  };

  const searchVideo = () => {
    const q = ex.name || 'exercício academia execução';
    const found = suggestions.find(s => s.name === ex.name) || { videoSearch: ex.name + ' execução academia' };
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(found.videoSearch || q + ' execução')}`, '_blank');
  };

  const cycleSuperset = () => {
    if (!ex.supersetGroup) {
      const nextLetter = supersetLetters[0] || 'A';
      onUpdate('supersetGroup', nextLetter);
    } else {
      const idx = SUPERSET_LETTERS.indexOf(ex.supersetGroup);
      const next = idx < SUPERSET_LETTERS.length - 1 ? SUPERSET_LETTERS[idx + 1] : null;
      onUpdate('supersetGroup', next);
    }
  };

  return (
    <div style={{
      background: 'white', borderRadius: 16, marginBottom: 10, overflow: 'visible',
      border: ssColor ? `2px solid ${ssColor}40` : `1.5px solid ${open ? ac + '40' : '#E5E7EB'}`,
      boxShadow: open ? `0 4px 16px ${ac}15` : '0 1px 4px rgba(0,0,0,0.05)',
      transition: 'all 0.2s',
    }}>
      {/* Superset badge */}
      {ssColor && (
        <div style={{ background: ssColor, padding: '3px 12px 3px 12px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: '14px 14px 0 0' }}>
          <Zap size={10} color="white" fill="white" />
          <span style={{ fontSize: 10, fontWeight: 800, color: 'white', letterSpacing: '0.08em' }}>
            SUPERSET {ex.supersetGroup}
          </span>
        </div>
      )}

      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', cursor: 'pointer', userSelect: 'none' }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: (ssColor || ac) + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: ssColor || ac, flexShrink: 0 }}>
          {index + 1}
        </div>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: ex.name ? '#111827' : '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {ex.name || 'Nome do exercício...'}
        </span>
        {!open && ex.name && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: ac, background: ac + '12', padding: '3px 9px', borderRadius: 20 }}>{sets}×{ex.reps || '—'}</span>
            {ex.load && <span style={{ fontSize: 11, color: '#6B7280' }}>{ex.load}kg</span>}
          </div>
        )}
        <ChevronDown size={16} color="#9CA3AF" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>

      {open && (
        <>
          <div style={{ borderTop: '1px solid #F3F4F6', padding: '16px 16px 0' }}>
            {/* Imagem automática do exercício */}
            {(exerciseImg || imgLoading) && (
              <div style={{ marginBottom: 14, borderRadius: 12, overflow: 'hidden', background: '#F9FAFB', height: imgLoading ? 120 : 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {imgLoading && !exerciseImg
                  ? <span style={{ fontSize: 12, color: '#9CA3AF' }}>Buscando demonstração...</span>
                  : exerciseImg
                    ? <img src={exerciseImg} alt={ex.name} style={{ width: '100%', maxHeight: 200, objectFit: 'contain', display: 'block' }} />
                    : null
                }
              </div>
            )}
            {/* Nome com autocomplete */}
            <div style={{ marginBottom: 14, position: 'relative' }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Nome do exercício</p>
              <input value={ex.name} onChange={e => handleNameChange(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setShowSugg(true); }}
                onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                placeholder="Digite para buscar na biblioteca..."
                autoFocus={!ex.name}
                style={{ fontSize: 15, fontWeight: 600, color: '#111827' }} />
              {showSugg && suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', borderRadius: 12, border: '1.5px solid #E5E7EB', zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                  {suggestions.map((s, i) => (
                    <button key={i} onMouseDown={() => selectSuggestion(s)}
                      style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottom: i < suggestions.length - 1 ? '1px solid #F9FAFB' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{s.name}</span>
                      <span style={{ fontSize: 10, color: '#9CA3AF', background: '#F3F4F6', padding: '2px 7px', borderRadius: 20, flexShrink: 0, fontWeight: 600 }}>{s.group}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Séries + Carga */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Séries</p>
                <div style={{ display: 'flex', alignItems: 'center', background: '#F9FAFB', borderRadius: 12, border: '1.5px solid #E5E7EB', overflow: 'hidden', height: 52 }}>
                  <button onClick={() => onUpdate('sets', Math.max(1, sets - 1))} style={{ width: 48, height: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ flex: 1, fontSize: 24, fontWeight: 900, color: '#111827', textAlign: 'center' }}>{sets}</span>
                  <button onClick={() => onUpdate('sets', sets + 1)} style={{ width: 48, height: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              </div>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Carga (kg)</p>
                <input value={ex.load || ''} onChange={e => onUpdate('load', e.target.value)} placeholder="0" type="number" min="0"
                  style={{ height: 52, fontSize: 24, fontWeight: 900, textAlign: 'center', background: '#F9FAFB', borderRadius: 12 }} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Repetições</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {REPS_QUICK.map(r => (
                  <button key={r} onClick={() => onUpdate('reps', r)}
                    style={{ padding: '8px 13px', borderRadius: 22, fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 40, border: `2px solid ${ex.reps === r ? ac : '#E5E7EB'}`, background: ex.reps === r ? ac : '#F9FAFB', color: ex.reps === r ? 'white' : '#6B7280', transition: 'all 0.1s' }}>
                    {r}
                  </button>
                ))}
                <input value={isCustomReps ? ex.reps : ''} onChange={e => onUpdate('reps', e.target.value)} placeholder="outro..."
                  style={{ width: 76, fontSize: 13, height: 40, textAlign: 'center', borderRadius: 22, border: `2px solid ${isCustomReps ? ac : '#E5E7EB'}`, background: isCustomReps ? ac + '10' : '#F9FAFB', color: isCustomReps ? ac : '#6B7280', fontWeight: 700 }} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Descanso</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {REST_QUICK.map(r => (
                  <button key={r} onClick={() => onUpdate('rest', r)}
                    style={{ padding: '8px 13px', borderRadius: 22, fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 40, border: `2px solid ${ex.rest === r ? ac : '#E5E7EB'}`, background: ex.rest === r ? ac : '#F9FAFB', color: ex.rest === r ? 'white' : '#6B7280', transition: 'all 0.1s' }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Vídeo */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                URL do Vídeo (YouTube)
                {videoFetching && <span style={{ marginLeft: 8, fontSize: 10, color: '#3B82F6', fontWeight: 600 }}>⏳ buscando vídeo...</span>}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={ex.videoUrl || ''} onChange={e => onUpdate('videoUrl', e.target.value)} placeholder={videoFetching ? 'Buscando vídeo automaticamente...' : 'https://youtube.com/watch?v=...'} style={{ flex: 1, fontSize: 13 }} />
                {ex.name && (
                  <button type="button" onClick={searchVideo}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 12px', borderRadius: 10, background: '#FEF2F2', color: '#EF4444', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, flexShrink: 0, minHeight: 44 }}
                    title="Buscar vídeo de demonstração no YouTube">
                    <ExternalLink size={13} /> Buscar vídeo
                  </button>
                )}
                {ex.videoUrl && (
                  <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 12px', borderRadius: 10, background: '#FEF3C7', color: '#D97706', textDecoration: 'none', fontSize: 13, fontWeight: 700, flexShrink: 0, minHeight: 44 }}>
                    <Play size={13} fill="#D97706" /> Ver
                  </a>
                )}
              </div>
              {ex.videoUrl && ex.videoUrl.includes('watch?v=') ? (
                <p style={{ margin: '5px 0 0', fontSize: 11, color: '#10B981' }}>
                  ✓ Vídeo encontrado — o aluno vai ver embutido no app durante o treino
                </p>
              ) : ex.videoUrl && ex.videoUrl.includes('results?') ? (
                <p style={{ margin: '5px 0 0', fontSize: 11, color: '#F59E0B' }}>
                  ⚠ Sem chave YouTube API — o aluno será redirecionado para busca. Adicione VITE_YOUTUBE_API_KEY no .env para vídeo automático.
                </p>
              ) : !ex.videoUrl && !videoFetching && ex.name ? (
                <p style={{ margin: '5px 0 0', fontSize: 11, color: '#9CA3AF' }}>
                  Selecione o exercício pelo autocomplete para buscar o vídeo automaticamente
                </p>
              ) : null}
            </div>

            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Observações</p>
              <input value={ex.obs || ''} onChange={e => onUpdate('obs', e.target.value)} placeholder="Dica de execução, equipamento, variação..." style={{ fontSize: 13 }} />
            </div>
          </div>

          <div style={{ padding: '8px 16px 14px', display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => onMove(index, -1)} disabled={index === 0} style={{ padding: '7px 12px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, cursor: index === 0 ? 'not-allowed' : 'pointer', color: index === 0 ? '#D1D5DB' : '#374151', fontSize: 13, fontWeight: 600 }}>↑</button>
              <button onClick={() => onMove(index, 1)} disabled={index === total - 1} style={{ padding: '7px 12px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, cursor: index === total - 1 ? 'not-allowed' : 'pointer', color: index === total - 1 ? '#D1D5DB' : '#374151', fontSize: 13, fontWeight: 600 }}>↓</button>
              {/* Superset toggle */}
              <button onClick={cycleSuperset}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: ssColor ? ssColor + '18' : '#F9FAFB', border: `1px solid ${ssColor || '#E5E7EB'}`, borderRadius: 8, cursor: 'pointer', color: ssColor || '#374151', fontSize: 13, fontWeight: 700 }}
                title="Agrupar em superset (A, B, C...) — clique para ciclar">
                <Zap size={12} />
                {ex.supersetGroup ? `Superset ${ex.supersetGroup}` : 'Superset'}
              </button>
            </div>
            <button onClick={onDelete} style={{ padding: '7px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, cursor: 'pointer', color: '#EF4444', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Trash2 size={13} /> Remover
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── TemplateModal ─────────────────────────────────────────── */
function TemplateModal({ mode, templates, exercises, planType, group, onSave, onLoad, onDelete, onClose }) {
  const [name, setName] = useState('');
  const canSave = exercises.filter(e => e.name?.trim()).length > 0;

  if (mode === 'save') return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '22px 22px 0 0', width: '100%', maxWidth: 480, padding: '24px 24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 900 }}>Salvar como template</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9CA3AF' }}>
              {canSave ? `${exercises.filter(e => e.name?.trim()).length} exercícios serão salvos` : 'Adicione exercícios antes de salvar'}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#6B7280" />
          </button>
        </div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Nome do template</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder={`Ex: ${group} - ${planType}`} autoFocus style={{ marginBottom: 16 }} />
        <button disabled={!canSave || !name.trim()} onClick={() => { onSave(name.trim()); onClose(); }}
          style={{ width: '100%', padding: '15px', background: canSave && name.trim() ? 'linear-gradient(135deg,#3B82F6,#8B5CF6)' : '#E5E7EB', border: 'none', borderRadius: 12, color: canSave && name.trim() ? 'white' : '#9CA3AF', fontSize: 15, fontWeight: 800, cursor: canSave && name.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <BookMarked size={16} /> Salvar template
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '22px 22px 0 0', width: '100%', maxWidth: 480, padding: '24px 24px 40px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 900 }}>Carregar template</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9CA3AF' }}>{templates.length} template{templates.length !== 1 ? 's' : ''} salvos</p>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#6B7280" />
          </button>
        </div>
        {templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF' }}>
            <BookMarked size={36} color="#E5E7EB" style={{ marginBottom: 10 }} />
            <p style={{ margin: 0, fontSize: 14 }}>Nenhum template salvo ainda</p>
            <p style={{ margin: '4px 0 0', fontSize: 12 }}>Monte um treino e clique em "Salvar template"</p>
          </div>
        ) : (
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...templates].reverse().map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E5E7EB', background: 'white' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Dumbbell size={18} color="#3B82F6" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>
                    {t.exercises.length} exercício{t.exercises.length !== 1 ? 's' : ''} · {t.planType || ''}
                    {t.exercises.some(e => e.supersetGroup) ? ' · tem supersets' : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => { onLoad(t); onClose(); }}
                    style={{ padding: '7px 14px', background: '#EFF6FF', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#3B82F6', fontSize: 13, fontWeight: 700 }}>
                    Usar
                  </button>
                  <button onClick={() => onDelete(t.id)}
                    style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF2F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={13} color="#EF4444" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── ConfigWeekModal ───────────────────────────────────────── */
function ConfigWeekModal({ onConfirm, onClose }) {
  const [freq, setFreq] = useState(4);
  const buildDayGroups = (f) => Object.fromEntries(FREQ_PRESETS[f].days.map((d, i) => [d, FREQ_PRESETS[f].groups[i]]));
  const [dayGroups, setDayGroups] = useState(() => buildDayGroups(4));
  const [saving, setSaving] = useState(false);
  const count = Object.keys(dayGroups).length;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 620, padding: '28px 24px 40px', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#111827' }}>Configurar Semana</h3>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#9CA3AF' }}>Monte a divisão semanal em segundos</p>
          </div>
          <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color="#6B7280" />
          </button>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Frequência semanal</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 28 }}>
          {[3,4,5,6].map(f => (
            <button key={f} onClick={() => { setFreq(f); setDayGroups(buildDayGroups(f)); }}
              style={{ padding: '16px 8px', borderRadius: 16, border: `2.5px solid ${freq === f ? '#3B82F6' : '#E5E7EB'}`, background: freq === f ? '#EFF6FF' : 'white', cursor: 'pointer', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: freq === f ? '#3B82F6' : '#374151' }}>{f}x</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: freq === f ? '#3B82F6' : '#9CA3AF', fontWeight: 600 }}>por semana</p>
            </button>
          ))}
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Dias e grupos musculares</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {DAYS.map(d => {
            const on = dayGroups[d.value] !== undefined;
            const grp = dayGroups[d.value];
            const gc = grp ? (GROUP_COLORS[grp] || '#3B82F6') : '#E5E7EB';
            return (
              <div key={d.value} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, border: `2px solid ${on ? gc + '50' : '#F1F5F9'}`, background: on ? gc + '08' : '#F9FAFB', cursor: 'pointer' }} onClick={() => {
                if (on) { const next = { ...dayGroups }; delete next[d.value]; setDayGroups(next); }
                else setDayGroups(prev => ({ ...prev, [d.value]: 'Peito' }));
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, border: `2.5px solid ${on ? gc : '#D1D5DB'}`, background: on ? gc : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {on && <Check size={15} color="white" strokeWidth={3} />}
                </div>
                <span style={{ width: 100, fontSize: 15, fontWeight: 700, color: on ? '#111827' : '#9CA3AF' }}>{d.full}</span>
                {on ? (
                  <select value={grp} onChange={e => { e.stopPropagation(); setDayGroups(prev => ({ ...prev, [d.value]: e.target.value })); }} onClick={e => e.stopPropagation()}
                    style={{ flex: 1, fontSize: 15, fontWeight: 700, color: gc, border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer' }}>
                    {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                ) : <span style={{ flex: 1, fontSize: 14, color: '#C4C4C4' }}>Descanso</span>}
              </div>
            );
          })}
        </div>
        <button onClick={async () => { setSaving(true); await onConfirm(dayGroups); setSaving(false); onClose(); }} disabled={saving || count === 0}
          style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', color: 'white', border: 'none', borderRadius: 14, cursor: count === 0 ? 'not-allowed' : 'pointer', fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: count === 0 ? 0.5 : 1 }}>
          {saving ? <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={20} />}
          {saving ? 'Configurando...' : `Criar ${count} dias de treino`}
        </button>
      </div>
    </div>
  );
}

/* ─── CopyPlanModal ─────────────────────────────────────────── */
function CopyPlanModal({ students, currentStudentId, onConfirm, onClose }) {
  const [target, setTarget] = useState('');
  const [copying, setCopying] = useState(false);
  const others = students.filter(s => String(s.id) !== String(currentStudentId));
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, padding: '28px 24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Copiar programa</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9CA3AF' }}>Todos os treinos da semana serão duplicados</p>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#6B7280" />
          </button>
        </div>
        {others.length === 0
          ? <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '20px 0' }}>Não há outros alunos ativos.</p>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {others.map(s => (
                <button key={s.id} onClick={() => setTarget(String(s.id))}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, border: `2px solid ${target === String(s.id) ? '#3B82F6' : '#E5E7EB'}`, background: target === String(s.id) ? '#EFF6FF' : 'white', cursor: 'pointer' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: s.color || '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                    {(s.initials || s.name?.slice(0, 2)).toUpperCase()}
                  </div>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: target === String(s.id) ? '#1D4ED8' : '#374151' }}>{s.name}</span>
                  {target === String(s.id) && <Check size={16} color="#3B82F6" />}
                </button>
              ))}
            </div>
        }
        <button disabled={!target || copying} onClick={async () => { setCopying(true); await onConfirm(target); setCopying(false); onClose(); }}
          style={{ width: '100%', padding: '15px', background: target ? 'linear-gradient(135deg,#3B82F6,#8B5CF6)' : '#E5E7EB', border: 'none', borderRadius: 12, color: target ? 'white' : '#9CA3AF', fontSize: 15, fontWeight: 800, cursor: target ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {copying ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Copy size={16} />}
          {copying ? 'Copiando...' : 'Copiar programa'}
        </button>
      </div>
    </div>
  );
}

/* ─── DayEditorSheet ────────────────────────────────────────── */
function DayEditorSheet({ day, dayInfo, group, setGroup, planName, setPlanName, planType, setPlanType, exercises, onUpdate, onDelete, onMove, onAdd, onSave, onDelete2, onClose, saving, saved, existing, onOpenTemplate }) {
  const gc = GROUP_COLORS[group] || '#3B82F6';

  // Compute which superset letters are already in use
  const usedLetters = [...new Set(exercises.map(e => e.supersetGroup).filter(Boolean))];
  const availableLetters = SUPERSET_LETTERS.filter(l => !usedLetters.includes(l));
  const supersetLetters = usedLetters.length > 0 ? [...usedLetters, ...availableLetters].slice(0, 5) : SUPERSET_LETTERS;

  // Group exercises for visual display
  const renderList = () => {
    const rendered = [];
    const seenGroups = new Set();
    exercises.forEach((ex, i) => {
      if (ex.supersetGroup && !seenGroups.has(ex.supersetGroup)) {
        seenGroups.add(ex.supersetGroup);
        const ssColor = SUPERSET_COLORS[ex.supersetGroup] || '#3B82F6';
        const groupExs = exercises.map((e, idx) => ({ e, idx })).filter(({ e }) => e.supersetGroup === ex.supersetGroup);
        rendered.push(
          <div key={`ss-${ex.supersetGroup}`} style={{ border: `2px solid ${ssColor}40`, borderRadius: 18, padding: '8px 8px 4px', marginBottom: 10, background: ssColor + '05' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px 8px' }}>
              <Zap size={12} color={ssColor} fill={ssColor} />
              <span style={{ fontSize: 11, fontWeight: 800, color: ssColor, letterSpacing: '0.08em' }}>SUPERSET {ex.supersetGroup}</span>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>— sem descanso entre os exercícios</span>
            </div>
            {groupExs.map(({ e, idx }) => (
              <ExerciseCard key={idx} ex={e} index={idx} total={exercises.length}
                onUpdate={(field, val) => onUpdate(idx, field, val)} onDelete={() => onDelete(idx)}
                onMove={onMove} accentColor={ssColor} autoOpen={!e.name}
                supersetLetters={supersetLetters} />
            ))}
          </div>
        );
      } else if (!ex.supersetGroup) {
        rendered.push(
          <ExerciseCard key={i} ex={ex} index={i} total={exercises.length}
            onUpdate={(field, val) => onUpdate(i, field, val)} onDelete={() => onDelete(i)}
            onMove={onMove} accentColor={gc} autoOpen={!ex.name}
            supersetLetters={supersetLetters} />
        );
      }
    });
    return rendered;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 680, margin: '0 auto', background: 'white', borderRadius: '20px 20px 0 0', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E5E7EB', margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <X size={16} color="#6B7280" />
            </button>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#374151', flex: 1 }}>{dayInfo?.full}</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {/* Template buttons */}
              <button onClick={() => onOpenTemplate('load')}
                style={{ display: 'flex', alignItems: 'center', gap: 5, height: 36, padding: '0 12px', background: '#F5F3FF', border: 'none', borderRadius: 10, cursor: 'pointer', color: '#7C3AED', fontSize: 12, fontWeight: 700 }}
                title="Carregar template">
                <FolderOpen size={14} /> Template
              </button>
              {existing && (
                <button onClick={onDelete2} style={{ width: 36, height: 36, borderRadius: '50%', background: '#FEF2F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={15} color="#EF4444" />
                </button>
              )}
              <button onClick={onSave} disabled={saving}
                style={{ padding: '0 18px', height: 36, background: saved ? '#10B981' : gc, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>
                {saving ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : saved ? <Check size={14} /> : <Save size={14} />}
                {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 12 }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nome do treino</p>
              <input value={planName} onChange={e => setPlanName(e.target.value)} placeholder={`Ex: Treino A — ${group}`} style={{ fontSize: 14, fontWeight: 700, color: '#111827' }} />
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tipo</p>
              <select value={planType} onChange={e => setPlanType(e.target.value)}
                style={{ height: 44, padding: '0 10px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 13, fontWeight: 700, color: '#374151', background: 'white', cursor: 'pointer', outline: 'none' }}>
                {PLAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, paddingBottom: 14, borderBottom: '1px solid #F3F4F6' }}>
            {GROUPS.map(g => (
              <button key={g} onClick={() => setGroup(g)}
                style={{ padding: '4px 10px', borderRadius: 20, border: `2px solid ${group === g ? (GROUP_COLORS[g] || '#3B82F6') : 'transparent'}`, background: group === g ? (GROUP_COLORS[g] || '#3B82F6') : 'transparent', color: group === g ? 'white' : '#9CA3AF', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s' }}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {exercises.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF' }}>
              <Dumbbell size={36} color="#E5E7EB" style={{ marginBottom: 10 }} />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Nenhum exercício ainda</p>
              <p style={{ margin: '4px 0 0', fontSize: 12 }}>Clique em "+ Adicionar exercício" abaixo ou carregue um template</p>
            </div>
          ) : renderList()}
          <div style={{ height: 16 }} />
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px 32px', flexShrink: 0, borderTop: '1px solid #F3F4F6', display: 'flex', gap: 10 }}>
          <button onClick={onAdd} style={{ flex: 1, padding: '14px', border: `2px dashed ${gc}60`, borderRadius: 14, background: gc + '06', color: gc, cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Plus size={17} /> Adicionar exercício
          </button>
          <button onClick={() => onOpenTemplate('save')}
            style={{ padding: '14px 16px', border: '2px dashed #7C3AED60', borderRadius: 14, background: '#F5F3FF', color: '#7C3AED', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
            title="Salvar como template para reutilizar">
            <BookMarked size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Tutorial ──────────────────────────────────────────────── */
function Tutorial({ onDismiss }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E0E7FF', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <HelpCircle size={20} color="white" />
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'white' }}>Como montar um treino</p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Siga esses passos e seu aluno terá o treino em minutos</p>
          </div>
        </div>
        <button onClick={onDismiss} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={15} color="white" />
        </button>
      </div>
      <div style={{ padding: '4px 0' }}>
        {TUTORIAL_STEPS.map((step, i) => {
          const isOpen = expanded === i;
          const StepIcon = step.Icon;
          return (
            <div key={i}>
              <button onClick={() => setExpanded(isOpen ? null : i)}
                style={{ width: '100%', padding: '14px 22px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: step.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <StepIcon size={19} color={step.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: step.color, background: step.bg, padding: '2px 8px', borderRadius: 20 }}>Passo {i + 1}</span>
                  <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: '#111827' }}>{step.title}</p>
                </div>
                <ChevronDown size={16} color="#9CA3AF" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
              </button>
              {isOpen && (
                <div style={{ padding: '12px 22px 14px 76px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>Selecione um aluno acima para começar →</p>
        <button onClick={onDismiss} style={{ fontSize: 12, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Entendido</button>
      </div>
    </div>
  );
}

/* ─── Componente principal ──────────────────────────────────── */
export default function Treinos() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState('');
  const [day, setDay] = useState(null);
  const [group, setGroup] = useState('Peito');
  const [planName, setPlanName] = useState('');
  const [planType, setPlanType] = useState('Hipertrofia');
  const [exercises, setExercises] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [configModal, setConfigModal] = useState(false);
  const [copyModal, setCopyModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [templateModal, setTemplateModal] = useState(null); // null | 'save' | 'load'
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    if (localStorage.getItem('treinos_tutorial_dismissed')) setShowTutorial(false);
  }, []);

  // Load templates from localStorage
  useEffect(() => {
    if (!user?.id) return;
    try {
      const saved = JSON.parse(localStorage.getItem(`wf_templates_${user.id}`)) || [];
      setTemplates(saved);
    } catch { setTemplates([]); }
  }, [user?.id]);

  const dismissTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('treinos_tutorial_dismissed', '1');
  };

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
  const newExercise = () => ({ name: '', sets: 4, reps: '10', rest: '60s', load: '', videoUrl: '', obs: '', supersetGroup: null });

  const openDay = (d) => {
    setDay(d); setSaved(false);
    const plan = planForDay(d);
    if (plan) {
      const detectedGroup = GROUPS.find(g => g === plan.name)
        || GROUPS.find(g => plan.name?.toLowerCase().includes(g.toLowerCase()))
        || 'Peito';
      setGroup(detectedGroup);
      setPlanName(plan.name || '');
      setPlanType(plan.type || 'Hipertrofia');
      setExercises((plan.exercises || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        .map(ex => ({ name: ex.name, sets: ex.sets || 4, reps: ex.reps || '10', rest: ex.rest || '60s', load: ex.load || '', videoUrl: ex.video_url || '', obs: ex.obs || '', supersetGroup: ex.superset_group || null })));
    } else {
      setGroup('Peito'); setPlanName(''); setPlanType('Hipertrofia');
      setExercises([newExercise()]);
    }
  };

  const updateEx = (idx, field, val) => setExercises(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e));
  const deleteEx = (idx) => setExercises(prev => prev.filter((_, i) => i !== idx));
  const moveEx = (idx, dir) => {
    setExercises(prev => {
      const arr = [...prev]; const swap = idx + dir;
      if (swap < 0 || swap >= arr.length) return arr;
      [arr[idx], arr[swap]] = [arr[swap], arr[idx]]; return arr;
    });
  };

  // Template save/load
  const saveTemplate = (name) => {
    const template = {
      id: `${Date.now()}`,
      name,
      group,
      planType,
      exercises: exercises.filter(e => e.name?.trim()).map(e => ({ ...e })),
      savedAt: new Date().toISOString(),
    };
    const updated = [...templates, template];
    setTemplates(updated);
    localStorage.setItem(`wf_templates_${user.id}`, JSON.stringify(updated));
  };

  const loadTemplate = (template) => {
    setExercises(template.exercises.map(e => ({ ...e })));
    if (template.planType) setPlanType(template.planType);
    if (template.group) setGroup(template.group);
  };

  const deleteTemplate = (id) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    localStorage.setItem(`wf_templates_${user.id}`, JSON.stringify(updated));
  };

  const savePlan = async () => {
    if (!studentId || day === null) return;
    const validEx = exercises.filter(e => e.name?.trim());
    if (validEx.length === 0) {
      alert('Adicione pelo menos 1 exercício antes de salvar o treino.');
      return;
    }
    setSaving(true);
    const student = students.find(s => String(s.id) === String(studentId));
    const existing = planForDay(day);
    const finalName = planName.trim() || group;
    const exRows = (id) => validEx.map((e, i) => ({
      plan_id: id, name: e.name, sets: parseInt(e.sets) || 4, reps: e.reps,
      load: e.load || '', rest: e.rest, video_url: e.videoUrl || '',
      obs: e.obs || '', order_index: i,
      superset_group: e.supersetGroup || null,
    }));
    if (hasSupabase) {
      if (existing) {
        await supabase.from('training_plans').update({ name: finalName, type: planType }).eq('id', existing.id);
        await supabase.from('exercises').delete().eq('plan_id', existing.id);
        if (validEx.length) await supabase.from('exercises').insert(exRows(existing.id));
        const { data: u } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', existing.id).single();
        if (u) setPlans(prev => prev.map(p => p.id === existing.id ? u : p));
      } else {
        const { data: plan } = await supabase.from('training_plans').insert({ personal_id: user.id, student_id: student?.id, student_name: student?.name, name: finalName, type: planType, days: [day] }).select().single();
        if (plan) {
          if (validEx.length) await supabase.from('exercises').insert(exRows(plan.id));
          const { data: full } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', plan.id).single();
          if (full) setPlans(prev => [full, ...prev]);
        }
      }
    } else {
      if (existing) setPlans(prev => prev.map(p => p.id === existing.id ? { ...p, name: finalName, type: planType, exercises: validEx } : p));
      else setPlans(prev => [{ id: Date.now(), student_id: studentId, student_name: student?.name, name: finalName, type: planType, days: [day], exercises: validEx }, ...prev]);
    }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const deleteDay = async () => {
    const existing = planForDay(day);
    if (!existing) { setDay(null); return; }
    if (hasSupabase) await supabase.from('training_plans').delete().eq('id', existing.id);
    setPlans(prev => prev.filter(p => p.id !== existing.id));
    setDay(null);
  };

  const handleConfigWeek = async (dayGroups) => {
    const student = students.find(s => String(s.id) === String(studentId));
    if (!student) return;
    const newPlansLocal = [];
    for (const [dayVal, grpName] of Object.entries(dayGroups)) {
      const dv = parseInt(dayVal);
      const existing = myPlans.find(p => (p.days || []).includes(dv));
      if (hasSupabase) {
        if (existing) {
          await supabase.from('training_plans').update({ name: grpName, type: 'Hipertrofia' }).eq('id', existing.id);
          const { data: u } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', existing.id).single();
          if (u) newPlansLocal.push({ type: 'update', plan: u });
        } else {
          const { data: plan } = await supabase.from('training_plans').insert({ personal_id: user.id, student_id: student.id, student_name: student.name, name: grpName, type: 'Hipertrofia', days: [dv] }).select().single();
          if (plan) {
            const { data: full } = await supabase.from('training_plans').select('*, exercises(*)').eq('id', plan.id).single();
            if (full) newPlansLocal.push({ type: 'insert', plan: full });
          }
        }
      } else {
        newPlansLocal.push({ type: 'insert', plan: { id: Date.now() + dv, student_id: studentId, student_name: student.name, name: grpName, type: 'Hipertrofia', days: [dv], exercises: [] } });
      }
    }
    setPlans(prev => {
      let arr = [...prev];
      for (const { type, plan } of newPlansLocal) {
        if (type === 'update') arr = arr.map(p => p.id === plan.id ? plan : p);
        else arr = [...arr, plan];
      }
      return arr;
    });
  };

  const handleCopyPlan = async (targetStudentId) => {
    const target = students.find(s => String(s.id) === targetStudentId);
    if (!target || !hasSupabase) return;
    for (const plan of myPlans) {
      const exs = [...(plan.exercises || [])].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      const { data: newPlan } = await supabase.from('training_plans').insert({ personal_id: user.id, student_id: target.id, student_name: target.name, name: plan.name, type: plan.type || 'Hipertrofia', days: plan.days || [] }).select().single();
      if (newPlan && exs.length) {
        await supabase.from('exercises').insert(exs.map((e, i) => ({
          plan_id: newPlan.id, name: e.name, sets: e.sets, reps: e.reps,
          rest: e.rest, load: e.load || '', video_url: e.video_url || e.videoUrl || '',
          obs: e.obs || '', order_index: i, superset_group: e.superset_group || null,
        })));
      }
    }
    const { data: refreshed } = await supabase.from('training_plans').select('*, exercises(*)').eq('personal_id', user.id);
    if (refreshed) setPlans(refreshed);
  };

  const dayInfo = DAYS.find(d => d.value === day);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, flex: 1 }}>
      <Loader size={28} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="page-padding" style={{ flex: 1 }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#111827' }}>Treinos</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#9CA3AF' }}>
            Monte o programa semanal de cada aluno · {templates.length > 0 ? `${templates.length} template${templates.length !== 1 ? 's' : ''} salvos` : 'sem templates ainda'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {templates.length > 0 && (
            <button onClick={() => setTemplateModal('load')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 20, background: '#F5F3FF', border: '1px solid #DDD6FE', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#7C3AED' }}>
              <FolderOpen size={14} /> Templates
            </button>
          )}
          {!showTutorial && (
            <button onClick={() => setShowTutorial(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 20, background: '#F1F5F9', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#6B7280' }}>
              <HelpCircle size={14} /> Como usar
            </button>
          )}
        </div>
      </div>

      {showTutorial && <Tutorial onDismiss={dismissTutorial} />}

      {/* Seleção de aluno */}
      <div style={{ background: 'white', borderRadius: 16, padding: '18px 20px', marginBottom: 14, border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Aluno</p>
        {students.length === 0 ? (
          <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>Nenhum aluno ativo. Cadastre primeiro na página Alunos.</p>
        ) : students.length > 8 ? (
          <select value={studentId} onChange={e => { setStudentId(e.target.value); setDay(null); }}
            style={{ width: '100%', height: 48, padding: '0 14px', borderRadius: 12, border: '1.5px solid #E5E7EB', fontSize: 15, fontWeight: 700, color: studentId ? '#111827' : '#9CA3AF', background: 'white', cursor: 'pointer', outline: 'none' }}>
            <option value="">Selecione um aluno...</option>
            {students.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
          </select>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {students.map(s => {
              const active = String(s.id) === studentId;
              return (
                <button key={s.id} onClick={() => { setStudentId(String(s.id)); setDay(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 16px', borderRadius: 40, border: `2.5px solid ${active ? '#3B82F6' : '#E5E7EB'}`, background: active ? '#EFF6FF' : 'white', cursor: 'pointer', transition: 'all 0.12s' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: s.color || '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                    {(s.initials || s.name?.slice(0, 2)).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: active ? '#1D4ED8' : '#374151' }}>{s.name.split(' ')[0]}</span>
                  {active && <Check size={14} color="#3B82F6" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {studentId && (
        <div style={{ background: 'white', borderRadius: 16, padding: '18px 20px', border: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Semana de treinos</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {myPlans.length > 0 && (
                <button onClick={() => setCopyModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 20, background: '#F3F4F6', color: '#374151', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  <Copy size={13} /> Copiar para...
                </button>
              )}
              <button onClick={() => setConfigModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 20, background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                Configurar semana
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {DAYS.map(d => {
              const plan = planForDay(d.value);
              const isActive = day === d.value;
              const gc2 = plan ? (GROUP_COLORS[plan.name] || '#6B7280') : null;
              const firstExercises = (plan?.exercises || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).slice(0, 3);
              const remaining = Math.max(0, (plan?.exercises || []).length - 3);
              const hasSupersets = (plan?.exercises || []).some(e => e.superset_group);
              return (
                <button key={d.value} onClick={() => openDay(d.value)}
                  style={{ flex: '0 0 auto', width: 110, padding: '12px 10px', borderRadius: 14, border: `2px solid ${isActive ? '#3B82F6' : plan ? gc2 + '55' : '#E5E7EB'}`, background: isActive ? '#EFF6FF' : plan ? gc2 + '08' : '#F9FAFB', cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s', boxShadow: isActive ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 800, color: isActive ? '#3B82F6' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.label}</p>
                  {plan ? (
                    <>
                      <p style={{ margin: '0 0 5px', fontSize: 12, fontWeight: 800, color: gc2, lineHeight: 1.2 }}>{plan.name}</p>
                      {hasSupersets && <p style={{ margin: '0 0 4px', fontSize: 9, color: '#7C3AED', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}><Zap size={9} fill="#7C3AED" />supersets</p>}
                      {firstExercises.map((ex, ei) => (
                        <p key={ei} style={{ margin: '0 0 1px', fontSize: 10, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ex.name.split(' ').slice(0, 3).join(' ')}
                        </p>
                      ))}
                      {remaining > 0 && <p style={{ margin: '2px 0 0', fontSize: 9, color: '#9CA3AF', fontWeight: 600 }}>+{remaining} mais</p>}
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, border: '2px dashed #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Plus size={11} color="#9CA3AF" />
                      </div>
                      <span style={{ fontSize: 10, color: '#9CA3AF' }}>Adicionar</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {myPlans.length === 0 && (
            <div style={{ marginTop: 14, padding: '14px 16px', background: '#EFF6FF', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Lightbulb size={18} color="#3B82F6" style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 13, color: '#1D4ED8', lineHeight: 1.5 }}>
                Clique em <strong>"Configurar semana"</strong> para montar a divisão automaticamente, ou clique em qualquer dia para começar do zero.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Editor */}
      {day !== null && (
        <DayEditorSheet
          day={day} dayInfo={dayInfo} group={group} setGroup={setGroup}
          planName={planName} setPlanName={setPlanName} planType={planType} setPlanType={setPlanType}
          exercises={exercises}
          onUpdate={updateEx} onDelete={deleteEx} onMove={moveEx}
          onAdd={() => setExercises(prev => [...prev, newExercise()])}
          onSave={savePlan} onDelete2={deleteDay} onClose={() => setDay(null)}
          saving={saving} saved={saved} existing={!!planForDay(day)}
          onOpenTemplate={(mode) => setTemplateModal(mode)}
        />
      )}

      {configModal && studentId && <ConfigWeekModal onConfirm={handleConfigWeek} onClose={() => setConfigModal(false)} />}
      {copyModal && studentId && <CopyPlanModal students={students} currentStudentId={studentId} onConfirm={handleCopyPlan} onClose={() => setCopyModal(false)} />}
      {templateModal && (
        <TemplateModal
          mode={templateModal}
          templates={templates}
          exercises={exercises}
          planType={planType}
          group={group}
          onSave={saveTemplate}
          onLoad={loadTemplate}
          onDelete={deleteTemplate}
          onClose={() => setTemplateModal(null)}
        />
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none} input[type=number]{-moz-appearance:textfield}`}</style>
    </div>
  );
}
