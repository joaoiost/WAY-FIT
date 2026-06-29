import { Award } from 'lucide-react';

export const LEVELS = [
  { name: 'Iniciante', min: 0,    max: 499,      color: '#10B981' },
  { name: 'Bronze',    min: 500,  max: 1499,     color: '#CD7F32' },
  { name: 'Prata',     min: 1500, max: 3499,     color: '#9CA3AF' },
  { name: 'Ouro',      min: 3500, max: 6999,     color: '#F59E0B' },
  { name: 'Elite',     min: 7000, max: Infinity, color: '#818CF8' },
];

export function getLevel(xp) {
  return [...LEVELS].reverse().find(l => xp >= l.min) || LEVELS[0];
}

export function calcXP(stats = {}) {
  return (
    (stats.workouts || 0) * 50 +
    (stats.measurements || 0) * 30 +
    (stats.waterGoalDays || 0) * 25 +
    (stats.achievementsUnlocked || 0) * 100
  );
}

export default function XPBar({ totalXP = 0, compact = false }) {
  const current = getLevel(totalXP);
  const idx = LEVELS.indexOf(current);
  const next = LEVELS[idx + 1];
  const pct = next
    ? Math.round(((totalXP - current.min) / (next.min - current.min)) * 100)
    : 100;

  if (compact) {
    return (
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Award size={20} color={current.color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: current.color }}>{current.name}</span>
            <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{totalXP} XP</span>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: current.color, borderRadius: 99, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <Award size={28} color={current.color} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: current.color }}>{current.name}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-900)' }}>{totalXP} XP</span>
          </div>
          {next && (
            <span style={{ fontSize: 10, color: 'var(--gray-400)' }}>
              {next.min - totalXP} XP para o nível {next.name}
            </span>
          )}
        </div>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: current.color, borderRadius: 99, transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)' }} />
      </div>
    </div>
  );
}
