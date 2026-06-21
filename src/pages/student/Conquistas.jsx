import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import XPBar, { LEVELS, getLevel, calcXP } from '../../components/UI/XPBar';

const ACHIEVEMENTS = [
  { key: 'first_workout',  emoji: '🏋️', label: 'Primeiro Passo',    desc: 'Complete seu primeiro treino',        xp: 100, check: s => s.workouts >= 1 },
  { key: 'workouts10',     emoji: '💪', label: 'Dedicação',          desc: 'Complete 10 treinos',                 xp: 150, check: s => s.workouts >= 10 },
  { key: 'workouts30',     emoji: '🔥', label: 'Consistência',       desc: 'Complete 30 treinos',                 xp: 300, check: s => s.workouts >= 30 },
  { key: 'workouts100',    emoji: '🏆', label: 'Centurião',          desc: 'Complete 100 treinos',                xp: 500, check: s => s.workouts >= 100 },
  { key: 'streak7',        emoji: '⚡', label: 'Sequência de Fogo',  desc: '7 dias consecutivos de atividade',   xp: 200, check: s => s.maxStreak >= 7 },
  { key: 'streak30',       emoji: '🌟', label: 'Imbatível',          desc: '30 dias consecutivos',                xp: 500, check: s => s.maxStreak >= 30 },
  { key: 'week5',          emoji: '🗓️', label: 'Semana Cheia',       desc: '5 treinos em uma semana',             xp: 150, check: s => s.maxWeekWorkouts >= 5 },
  { key: 'water7',         emoji: '💧', label: 'Hidratado',          desc: 'Bata a meta de água 7 dias',          xp: 150, check: s => s.waterGoalDays >= 7 },
  { key: 'water30',        emoji: '🌊', label: 'Oceano',             desc: 'Bata a meta de água 30 dias',         xp: 300, check: s => s.waterGoalDays >= 30 },
  { key: 'measure1',       emoji: '📏', label: 'Me Conheço',         desc: 'Registre sua primeira medição',       xp: 100, check: s => s.measurements >= 1 },
  { key: 'measure6',       emoji: '📊', label: 'Controle Total',     desc: 'Registre 6 medições',                 xp: 200, check: s => s.measurements >= 6 },
  { key: 'weight_loss3',   emoji: '⬇️', label: 'Transformação',      desc: 'Perca 3kg em relação ao início',      xp: 300, check: s => s.weightDelta <= -3 },
  { key: 'early_bird',     emoji: '🌅', label: 'Madrugador',         desc: 'Complete 5 treinos antes das 7h',     xp: 200, check: s => s.earlyWorkouts >= 5 },
  { key: 'rating5',        emoji: '⭐', label: 'Satisfeito',         desc: 'Avalie um treino com nota máxima',    xp: 100, check: s => s.maxRating >= 5 },
  { key: 'food_log7',      emoji: '🥗', label: 'Nutrido',            desc: 'Registre alimentação por 7 dias',     xp: 200, check: s => s.foodLogDays >= 7 },
  { key: 'food_log30',     emoji: '🍎', label: 'Nutricional',        desc: 'Registre alimentação por 30 dias',    xp: 400, check: s => s.foodLogDays >= 30 },
  { key: 'challenge1',     emoji: '🎯', label: 'Desafiador',         desc: 'Complete um desafio',                 xp: 200, check: s => s.challengesCompleted >= 1 },
  { key: 'challenge5',     emoji: '🎪', label: 'Campeão',            desc: 'Complete 5 desafios',                 xp: 500, check: s => s.challengesCompleted >= 5 },
  { key: 'photo_progress', emoji: '📸', label: 'Transformador',      desc: 'Registre 2 fotos de progresso',       xp: 150, check: s => s.photos >= 2 },
  { key: 'perfect_week',   emoji: '💯', label: 'Semana Perfeita',    desc: '5+ treinos e meta de água na semana', xp: 250, check: s => s.maxWeekWorkouts >= 5 && s.waterGoalDays >= 5 },
];

function calcMaxStreak(sessions) {
  if (!sessions?.length) return 0;
  const dates = [...new Set(sessions.map(s => s.started_at?.slice(0, 10)).filter(Boolean))].sort();
  let max = 1, cur = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = (new Date(dates[i]) - new Date(dates[i - 1])) / 86400000;
    cur = diff === 1 ? cur + 1 : 1;
    if (cur > max) max = cur;
  }
  return max;
}

function calcMaxWeekWorkouts(sessions) {
  if (!sessions?.length) return 0;
  const wc = {};
  sessions.forEach(s => {
    const d = new Date(s.started_at);
    const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
    const k = ws.toISOString().slice(0, 10);
    wc[k] = (wc[k] || 0) + 1;
  });
  return Math.max(0, ...Object.values(wc));
}

export default function Conquistas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [unlocked, setUnlocked] = useState([]);

  useEffect(() => {
    if (!user || !hasSupabase) { setLoading(false); return; }
    loadData();
  }, [user?.id]);

  async function loadData() {
    const [sessRes, measRes, waterRes, foodRes, photoRes, chalRes] = await Promise.all([
      supabase.from('workout_sessions').select('id,started_at,rating').eq('student_id', user.studentId),
      supabase.from('student_measurements').select('weight,recorded_at').eq('student_id', user.studentId).order('recorded_at'),
      supabase.from('water_logs').select('intake_ml,goal_ml,date').eq('student_id', user.studentId),
      supabase.from('food_logs').select('date').eq('student_id', user.studentId).then(r => r).catch(() => ({ data: [] })),
      supabase.from('progress_photos').select('id').eq('student_id', user.studentId),
      supabase.from('student_challenges').select('completed_at').eq('student_id', user.studentId).not('completed_at', 'is', null).then(r => r).catch(() => ({ data: [] })),
    ]);

    const sessions = sessRes.data || [];
    const meass = measRes.data || [];
    const waterLogs = waterRes.data || [];
    const foodLogs = foodRes.data || [];
    const photos = photoRes.data || [];
    const challengesDone = chalRes.data || [];

    const s = {
      workouts: sessions.length,
      measurements: meass.length,
      waterGoalDays: waterLogs.filter(w => w.intake_ml >= (w.goal_ml || 2000)).length,
      foodLogDays: [...new Set(foodLogs.map(f => f.date))].length,
      challengesCompleted: challengesDone.length,
      photos: photos.length,
      maxRating: Math.max(0, ...sessions.map(s => s.rating || 0)),
      weightDelta: meass.length >= 2 ? parseFloat(meass[meass.length - 1]?.weight || 0) - parseFloat(meass[0]?.weight || 0) : 0,
      maxStreak: calcMaxStreak(sessions),
      maxWeekWorkouts: calcMaxWeekWorkouts(sessions),
      earlyWorkouts: sessions.filter(s => new Date(s.started_at).getHours() < 7).length,
    };
    s.achievementsUnlocked = ACHIEVEMENTS.filter(a => a.check(s)).length;

    setStats(s);
    setUnlocked(ACHIEVEMENTS.filter(a => a.check(s)).map(a => a.key));

    // save newly unlocked achievements
    const toSave = ACHIEVEMENTS.filter(a => a.check(s)).map(a => ({
      student_id: user.studentId,
      achievement_key: a.key,
      unlocked_at: new Date().toISOString(),
    }));
    if (toSave.length > 0) {
      await supabase.from('student_achievements').upsert(toSave, { onConflict: 'student_id,achievement_key', ignoreDuplicates: true }).catch(() => {});
    }

    setLoading(false);
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const totalXP = stats ? calcXP(stats) : 0;
  const level = getLevel(totalXP);
  const levelIdx = LEVELS.indexOf(level);
  const nextLevel = LEVELS[levelIdx + 1];
  const pct = nextLevel ? Math.round(((totalXP - level.min) / (nextLevel.min - level.min)) * 100) : 100;

  return (
    <div className="page-padding" style={{ paddingBottom: 100 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Conquistas & XP</h2>
          <p className="page-subtitle">Sua jornada de evolução</p>
        </div>
        <Trophy size={24} color="var(--accent)" />
      </div>

      {/* XP Hero */}
      <div style={{ background: 'linear-gradient(135deg, var(--bg-surface) 0%, #1a1f2e 100%)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 6 }}>{level.emoji}</div>
        <p style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 900, color: level.color }}>{level.name}</p>
        <p style={{ margin: '0 0 14px', fontSize: 36, fontWeight: 900, color: 'var(--gray-900)', lineHeight: 1 }}>{totalXP} <span style={{ fontSize: 16, color: 'var(--gray-400)', fontWeight: 600 }}>XP</span></p>
        <div style={{ height: 10, borderRadius: 99, background: 'var(--border)', overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: level.color, borderRadius: 99, transition: 'width 1s ease' }} />
        </div>
        {nextLevel ? (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-400)' }}>
            {nextLevel.min - totalXP} XP para {nextLevel.emoji} {nextLevel.name}
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: 12, color: level.color, fontWeight: 700 }}>Nível máximo atingido! 🎉</p>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Treinos', value: stats.workouts },
            { label: 'Sequência', value: `${stats.maxStreak}d` },
            { label: 'Conquistas', value: `${unlocked.length}/${ACHIEVEMENTS.length}` },
          ].map(s => (
            <div key={s.label} className="kpi-card" style={{ flex: 1, cursor: 'default', padding: '12px 10px', textAlign: 'center' }}>
              <p className="kpi-card-value" style={{ fontSize: 20 }}>{s.value}</p>
              <p className="kpi-card-label">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Achievements grid */}
      <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Suas Conquistas
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
        {ACHIEVEMENTS.map(a => {
          const done = unlocked.includes(a.key);
          return (
            <div key={a.key} style={{
              background: done ? 'var(--bg-surface)' : 'var(--bg-page)',
              border: `1px solid ${done ? 'var(--accent)30' : 'var(--border)'}`,
              borderRadius: 12, padding: 14,
              opacity: done ? 1 : 0.45,
              filter: done ? 'none' : 'grayscale(0.6)',
              position: 'relative',
              transition: 'all 0.2s',
            }}>
              {done && (
                <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 10, fontWeight: 700, background: 'var(--accent)', color: 'white', borderRadius: 20, padding: '2px 7px' }}>
                  +{a.xp} XP
                </div>
              )}
              <div style={{ fontSize: 26, marginBottom: 6 }}>{a.emoji}</div>
              <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 800, color: 'var(--gray-900)' }}>{a.label}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)', lineHeight: 1.3 }}>{a.desc}</p>
              {!done && (
                <p style={{ margin: '6px 0 0', fontSize: 10, color: 'var(--gray-400)' }}>🔒 +{a.xp} XP</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
