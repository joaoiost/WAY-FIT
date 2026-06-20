import { useState, useEffect } from 'react';
import { Target, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const TYPE_META = {
  workouts:       { emoji: '🏋️', unit: 'treinos' },
  water_days:     { emoji: '💧', unit: 'dias' },
  food_log_days:  { emoji: '🥗', unit: 'dias' },
  streak_days:    { emoji: '🔥', unit: 'dias' },
  weight_loss_kg: { emoji: '⬇️', unit: 'kg' },
  measurements:   { emoji: '📏', unit: 'medições' },
};

function computeProgress(challenge, sessions, waterLogs, foodLogs) {
  const start = challenge.start_date ? new Date(challenge.start_date) : new Date(0);
  const end = challenge.end_date ? new Date(challenge.end_date + 'T23:59:59') : new Date();
  const inRange = d => { const dt = new Date(d); return dt >= start && dt <= end; };

  switch (challenge.type) {
    case 'workouts':
      return (sessions || []).filter(s => inRange(s.started_at)).length;
    case 'water_days':
      return (waterLogs || []).filter(w => inRange(w.date) && w.intake_ml >= (w.goal_ml || 2000)).length;
    case 'food_log_days':
      return [...new Set((foodLogs || []).filter(f => inRange(f.date)).map(f => f.date))].length;
    default:
      return 0;
  }
}

function daysLeft(endDate) {
  if (!endDate) return null;
  const diff = Math.ceil((new Date(endDate + 'T23:59:59') - new Date()) / 86400000);
  return diff;
}

export default function Desafios() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState([]);
  const [studentChallenges, setStudentChallenges] = useState([]);
  const [progressMap, setProgressMap] = useState({});

  useEffect(() => {
    if (!user || !hasSupabase) { setLoading(false); return; }
    loadData();
  }, [user?.id]);

  async function loadData() {
    const [chalRes, scRes, sessRes, waterRes, foodRes] = await Promise.all([
      supabase.from('challenges').select('*').order('end_date'),
      supabase.from('student_challenges').select('*').eq('student_id', user.id).then(r => r).catch(() => ({ data: [] })),
      supabase.from('workout_sessions').select('started_at').eq('student_id', user.id),
      supabase.from('water_logs').select('date,intake_ml,goal_ml').eq('student_id', user.id),
      supabase.from('food_logs').select('date').eq('student_id', user.id).then(r => r).catch(() => ({ data: [] })),
    ]);

    const chs = chalRes.data || [];
    const scs = scRes.data || [];
    const sessions = sessRes.data || [];
    const waterLogs = waterRes.data || [];
    const foodLogs = foodRes.data || [];

    const pm = {};
    for (const ch of chs) {
      pm[ch.id] = computeProgress(ch, sessions, waterLogs, foodLogs);
    }
    setProgressMap(pm);

    // auto-complete newly done challenges
    const toComplete = chs.filter(ch => {
      const sc = scs.find(s => s.challenge_id === ch.id);
      return pm[ch.id] >= ch.target_value && (!sc || !sc.completed_at);
    });
    for (const ch of toComplete) {
      await supabase.from('student_challenges').upsert({
        student_id: user.id,
        challenge_id: ch.id,
        progress: pm[ch.id],
        completed_at: new Date().toISOString(),
      }, { onConflict: 'student_id,challenge_id' }).catch(() => {});
    }

    if (toComplete.length) {
      const { data: updated } = await supabase.from('student_challenges').select('*').eq('student_id', user.id);
      setStudentChallenges(updated || []);
    } else {
      setStudentChallenges(scs);
    }

    setChallenges(chs);
    setLoading(false);
  }

  function isCompleted(challengeId) {
    return studentChallenges.some(s => s.challenge_id === challengeId && s.completed_at);
  }

  const xpEarned = challenges
    .filter(ch => isCompleted(ch.id))
    .reduce((sum, ch) => sum + (ch.xp_reward || 0), 0);

  const active = challenges.filter(ch => !isCompleted(ch.id));
  const done = challenges.filter(ch => isCompleted(ch.id));

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page-padding" style={{ paddingBottom: 100 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Desafios</h2>
          <p className="page-subtitle">Complete e ganhe XP</p>
        </div>
        <Target size={24} color="var(--accent)" />
      </div>

      {/* XP earned */}
      {xpEarned > 0 && (
        <div className="kpi-card" style={{ cursor: 'default', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🎯</span>
          <div>
            <p className="kpi-card-label">XP de Desafios</p>
            <p className="kpi-card-value" style={{ fontSize: 22, color: 'var(--yellow)' }}>{xpEarned} XP</p>
          </div>
        </div>
      )}

      {challenges.length === 0 && (
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <div className="empty-state-icon"><Target size={28} /></div>
          <p className="empty-state-title">Nenhum desafio ainda</p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-400)', textAlign: 'center' }}>Seu personal ainda não criou desafios para você</p>
        </div>
      )}

      {active.length > 0 && (
        <>
          <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Em Andamento</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {active.map(ch => <ChallengeCard key={ch.id} ch={ch} progress={progressMap[ch.id] || 0} done={false} />)}
          </div>
        </>
      )}

      {done.length > 0 && (
        <>
          <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Concluídos ✓</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {done.map(ch => <ChallengeCard key={ch.id} ch={ch} progress={ch.target_value} done={true} />)}
          </div>
        </>
      )}
    </div>
  );
}

function ChallengeCard({ ch, progress, done }) {
  const meta = TYPE_META[ch.type] || { emoji: '🎯', unit: '' };
  const pct = Math.min(100, Math.round((progress / ch.target_value) * 100));
  const left = daysLeft(ch.end_date);

  return (
    <div style={{
      background: 'var(--bg-surface)', border: `1px solid ${done ? 'rgba(63,185,80,0.3)' : 'var(--border)'}`,
      borderRadius: 14, padding: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 28, flexShrink: 0 }}>{meta.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: done ? 'var(--green)' : 'var(--gray-900)' }}>
              {done && '✅ '}{ch.title}
            </p>
            {ch.xp_reward && (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--yellow)', background: 'rgba(210,153,34,0.12)', padding: '2px 8px', borderRadius: 20, flexShrink: 0, marginLeft: 8 }}>
                +{ch.xp_reward} XP
              </span>
            )}
          </div>
          {ch.description && <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--gray-400)' }}>{ch.description}</p>}
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
            {progress} / {ch.target_value} {meta.unit}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: done ? 'var(--green)' : 'var(--accent)' }}>{pct}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: done ? 'var(--green)' : 'var(--accent)', borderRadius: 99, transition: 'width 0.8s ease' }} />
        </div>
      </div>

      {!done && left !== null && (
        <p style={{ margin: 0, fontSize: 11, color: left < 3 ? 'var(--red)' : left < 7 ? 'var(--yellow)' : 'var(--gray-400)', fontWeight: 600 }}>
          {left > 0 ? `⏱ ${left} dia${left !== 1 ? 's' : ''} restante${left !== 1 ? 's' : ''}` : '🔴 Encerrado'}
        </p>
      )}
    </div>
  );
}
