import { useState, useEffect, useRef, useCallback } from 'react';
import { Droplets, Plus, Minus, Trophy } from 'lucide-react';
import { supabase, hasSupabase } from '../../lib/supabase';

const GLASS_ML = 250;

function storageKey(studentId) {
  const today = new Date().toISOString().slice(0, 10);
  return `water_${today}_${studentId || 'guest'}`;
}
function celebratedKey(studentId) {
  const today = new Date().toISOString().slice(0, 10);
  return `water_celebrated_${today}_${studentId || 'guest'}`;
}

/* Bubble component floating up */
function Bubble({ style }) {
  return <div className="water-bubble" style={style} />;
}

export default function WaterTracker({ goalMl = 2000, studentId }) {
  const [intake, setIntake] = useState(0);
  const [ripples, setRipples] = useState([]);
  const [celebrating, setCelebrating] = useState(false);
  const [goalReachedAnim, setGoalReachedAnim] = useState(false);
  const rippleId = useRef(0);
  const prevIntake = useRef(intake);
  const alreadyCelebrated = useRef(false);
  const syncTimer = useRef(null);

  /* load from localStorage + Supabase (takes the higher value to sync across devices) */
  useEffect(() => {
    const saved = parseInt(localStorage.getItem(storageKey(studentId)) || '0', 10);
    const apply = (val) => {
      setIntake(val);
      prevIntake.current = val;
      if (val >= goalMl && localStorage.getItem(celebratedKey(studentId))) setGoalReachedAnim(true);
    };
    if (hasSupabase && studentId && studentId !== 'guest') {
      const today = new Date().toISOString().slice(0, 10);
      supabase.from('water_logs').select('intake_ml').eq('student_id', studentId).eq('date', today).maybeSingle()
        .then(({ data }) => apply(Math.max(saved, data?.intake_ml || 0)));
    } else {
      apply(saved);
    }
  }, [studentId, goalMl]);

  /* persist to localStorage + sync to Supabase (debounced 1s) */
  useEffect(() => {
    localStorage.setItem(storageKey(studentId), String(intake));
    if (hasSupabase && studentId && studentId !== 'guest') {
      clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => {
        const today = new Date().toISOString().slice(0, 10);
        supabase.from('water_logs').upsert(
          { student_id: studentId, date: today, intake_ml: intake, goal_ml: goalMl },
          { onConflict: 'student_id,date' }
        );
      }, 1000);
    }
    /* trigger celebration once per day when goal first reached */
    if (intake >= goalMl && prevIntake.current < goalMl && !alreadyCelebrated.current) {
      if (!localStorage.getItem(celebratedKey(studentId))) {
        alreadyCelebrated.current = true;
        localStorage.setItem(celebratedKey(studentId), '1');
        setCelebrating(true);
        setTimeout(() => { setCelebrating(false); setGoalReachedAnim(true); }, 3500);
      } else {
        setGoalReachedAnim(true);
      }
    }
    prevIntake.current = intake;
  }, [intake, goalMl, studentId]);

  const addGlass = useCallback(() => {
    setIntake(v => Math.min(v + GLASS_ML, goalMl * 2));
    /* spawn ripple */
    const id = ++rippleId.current;
    setRipples(r => [...r, id]);
    setTimeout(() => setRipples(r => r.filter(x => x !== id)), 800);
  }, [goalMl]);

  const removeGlass = useCallback(() => {
    setIntake(v => Math.max(0, v - GLASS_ML));
    if (intake - GLASS_ML < goalMl) { setGoalReachedAnim(false); alreadyCelebrated.current = false; }
  }, [intake, goalMl]);

  const pct = Math.min(100, Math.round((intake / goalMl) * 100));
  const liters = (intake / 1000).toFixed(1);
  const goalL = (goalMl / 1000).toFixed(1);
  const glasses = Math.round(intake / GLASS_ML);
  const goalGlasses = Math.round(goalMl / GLASS_ML);

  /* wave level: 0% = top, 100% = bottom; we invert so fill rises */
  const waveLevelPct = 100 - pct;

  const BUBBLES = [
    { left: '15%', animDuration: '2.2s', delay: '0s',   size: 8 },
    { left: '30%', animDuration: '2.8s', delay: '0.4s', size: 5 },
    { left: '50%', animDuration: '2.0s', delay: '0.8s', size: 10 },
    { left: '65%', animDuration: '3.1s', delay: '0.2s', size: 6 },
    { left: '80%', animDuration: '2.5s', delay: '1.0s', size: 7 },
  ];

  return (
    <>
      {/* ── Celebration overlay ── */}
      {celebrating && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', pointerEvents: 'none',
        }}>
          {/* Water flood from bottom */}
          <div className="water-flood" />

          {/* Bubbles rising */}
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="water-celebrate-bubble" style={{
              left: `${Math.random() * 90 + 5}%`,
              width: `${Math.random() * 14 + 6}px`,
              height: `${Math.random() * 14 + 6}px`,
              animationDuration: `${Math.random() * 1.5 + 1}s`,
              animationDelay: `${Math.random() * 2}s`,
            }} />
          ))}

          {/* Center message */}
          <div className="water-celebrate-msg">
            <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 16 }}>💧</div>
            <p style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>
              Meta atingida!
            </p>
            <p style={{ margin: 0, fontSize: 16, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
              {liters}L · {glasses} copos hoje!
            </p>
          </div>
        </div>
      )}

      {/* ── Card ── */}
      <div style={{
        background: goalReachedAnim
          ? 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)'
          : 'white',
        borderRadius: 20,
        padding: '20px 20px 18px',
        boxShadow: goalReachedAnim
          ? '0 8px 32px rgba(14,165,233,0.35)'
          : 'var(--shadow-sm)',
        border: goalReachedAnim ? 'none' : '1px solid var(--border)',
        marginBottom: 16,
        transition: 'background 0.6s ease, box-shadow 0.6s ease',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle water texture when complete */}
        {goalReachedAnim && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 20\'%3E%3Cpath d=\'M0 10 Q25 0 50 10 Q75 20 100 10 L100 20 L0 20Z\' fill=\'rgba(255,255,255,0.08)\'/%3E%3C/svg%3E") repeat-x bottom',
            backgroundSize: '200px 40px',
            animation: 'waveScroll 3s linear infinite',
          }} />
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 11,
              background: goalReachedAnim ? 'rgba(255,255,255,0.25)' : 'linear-gradient(135deg, #BAE6FD, #38BDF8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {goalReachedAnim
                ? <Trophy size={18} color="white" fill="white" />
                : <Droplets size={18} color="#0284C7" />
              }
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: goalReachedAnim ? 'white' : 'var(--gray-900)' }}>
                {goalReachedAnim ? 'Meta atingida! 🎉' : 'Hidratação'}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: goalReachedAnim ? 'rgba(255,255,255,0.75)' : 'var(--gray-400)', fontWeight: 500 }}>
                {goalGlasses} copos = {goalL}L hoje
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: goalReachedAnim ? 'white' : '#0284C7', lineHeight: 1 }}>
              {liters}L
            </p>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: goalReachedAnim ? 'rgba(255,255,255,0.7)' : 'var(--gray-400)' }}>
              de {goalL}L
            </p>
          </div>
        </div>

        {/* Visual: animated wave circle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 16 }}>
          {/* Circle with wave */}
          <div style={{
            width: 90, height: 90, borderRadius: '50%', position: 'relative',
            flexShrink: 0, overflow: 'hidden',
            border: `3px solid ${goalReachedAnim ? 'rgba(255,255,255,0.4)' : '#BAE6FD'}`,
            background: goalReachedAnim ? 'rgba(255,255,255,0.15)' : '#F0F9FF',
          }}>
            {/* Water fill */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: `${pct}%`,
              background: goalReachedAnim
                ? 'rgba(255,255,255,0.3)'
                : 'linear-gradient(180deg, #38BDF8 0%, #0284C7 100%)',
              transition: 'height 0.6s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
              {/* Wave on top */}
              <div className="water-wave-inner" style={{
                position: 'absolute', top: -8, left: 0,
                width: '200%', height: 16,
                background: goalReachedAnim ? 'rgba(255,255,255,0.4)' : '#38BDF8',
                borderRadius: '50% 50% 0 0',
              }} />
            </div>

            {/* Bubbles inside circle */}
            {pct > 10 && BUBBLES.slice(0, Math.ceil(pct / 20)).map((b, i) => (
              <Bubble key={i} style={{
                position: 'absolute', bottom: `${(i * 18) % 60}%`, left: b.left,
                width: b.size, height: b.size,
                borderRadius: '50%',
                background: goalReachedAnim ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.7)',
                animationDuration: b.animDuration,
                animationDelay: b.delay,
              }} />
            ))}

            {/* Percentage label */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontSize: 18, fontWeight: 900,
                color: pct > 50
                  ? (goalReachedAnim ? 'rgba(255,255,255,0.9)' : 'white')
                  : (goalReachedAnim ? 'rgba(255,255,255,0.7)' : '#0284C7'),
                textShadow: pct > 50 ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
              }}>
                {pct}%
              </span>
            </div>
          </div>

          {/* Right: progress bars per glass */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
              {Array.from({ length: goalGlasses }).map((_, i) => (
                <div key={i} style={{
                  width: 20, height: 28, borderRadius: 5,
                  background: i < glasses
                    ? (goalReachedAnim ? 'rgba(255,255,255,0.7)' : '#0284C7')
                    : (goalReachedAnim ? 'rgba(255,255,255,0.2)' : '#E0F2FE'),
                  transition: 'background 0.3s ease',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {i < glasses && (
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
                      background: goalReachedAnim ? 'rgba(255,255,255,0.3)' : '#0EA5E9',
                      borderRadius: '0 0 5px 5px',
                    }} />
                  )}
                </div>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 12, color: goalReachedAnim ? 'rgba(255,255,255,0.8)' : 'var(--gray-500)', fontWeight: 500 }}>
              {glasses} de {goalGlasses} copos
            </p>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={removeGlass} disabled={intake === 0}
            style={{
              width: 40, height: 40, borderRadius: 12, border: 'none', cursor: intake === 0 ? 'default' : 'pointer',
              background: goalReachedAnim ? 'rgba(255,255,255,0.2)' : 'var(--gray-100)',
              color: goalReachedAnim ? 'rgba(255,255,255,0.7)' : 'var(--gray-500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: intake === 0 ? 0.4 : 1, flexShrink: 0, transition: 'all 0.15s',
            }}>
            <Minus size={16} />
          </button>

          <button onClick={addGlass}
            style={{
              flex: 1, height: 44, borderRadius: 13, border: 'none', cursor: 'pointer',
              background: goalReachedAnim
                ? 'rgba(255,255,255,0.25)'
                : 'linear-gradient(135deg, #0EA5E9, #0284C7)',
              color: 'white', fontSize: 14, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: goalReachedAnim ? 'none' : '0 4px 14px rgba(2,132,199,0.4)',
              position: 'relative', overflow: 'hidden', transition: 'all 0.15s',
            }}>
            {/* Ripple effects */}
            {ripples.map(id => (
              <span key={id} className="water-btn-ripple" />
            ))}
            <Plus size={17} />
            + Copo (250ml)
          </button>
        </div>
      </div>

      <style>{`
        .water-wave-inner {
          animation: waveScroll 1.6s linear infinite;
        }
        @keyframes waveScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .water-bubble {
          position: absolute;
          border-radius: 50%;
          animation: bubbleRise var(--dur, 2s) ease-in infinite;
        }
        @keyframes bubbleRise {
          0%   { transform: translateY(0) scale(1); opacity: 0.7; }
          100% { transform: translateY(-80px) scale(0.5); opacity: 0; }
        }

        .water-btn-ripple {
          position: absolute;
          width: 10px; height: 10px;
          border-radius: 50%;
          background: rgba(255,255,255,0.6);
          animation: btnRipple 0.7s ease-out forwards;
          pointer-events: none;
        }
        @keyframes btnRipple {
          0%   { transform: scale(0); opacity: 1; }
          100% { transform: scale(12); opacity: 0; }
        }

        /* ─── Celebration ─── */
        .water-flood {
          position: fixed; bottom: -10%; left: 0; right: 0;
          height: 120%;
          background: linear-gradient(180deg, #0EA5E9 0%, #0369A1 100%);
          animation: floodRise 1.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          border-radius: 50% 50% 0 0 / 10% 10% 0 0;
        }
        @keyframes floodRise {
          0%   { transform: translateY(100%); opacity: 0.9; }
          60%  { transform: translateY(0%); opacity: 1; }
          80%  { transform: translateY(5%); }
          100% { transform: translateY(0%); opacity: 0; }
        }

        .water-celebrate-bubble {
          position: fixed;
          border-radius: 50%;
          background: rgba(255,255,255,0.7);
          animation: celebBubble var(--dur, 2s) ease-in forwards;
          bottom: -20px;
        }
        @keyframes celebBubble {
          0%   { transform: translateY(0) scale(1); opacity: 0.8; }
          70%  { opacity: 0.6; }
          100% { transform: translateY(-110vh) scale(0.3); opacity: 0; }
        }

        .water-celebrate-msg {
          position: relative; z-index: 1;
          text-align: center;
          animation: celebMsgIn 0.5s ease 0.8s both;
        }
        @keyframes celebMsgIn {
          0%   { transform: scale(0.5) translateY(30px); opacity: 0; }
          60%  { transform: scale(1.08) translateY(-4px); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
