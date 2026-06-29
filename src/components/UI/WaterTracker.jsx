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

/* SVG sine wave — two layers for depth */
function WaveSVG({ color1, color2 }) {
  return (
    <svg
      style={{ position: 'absolute', top: -18, left: 0, width: '200%', height: 36, display: 'block' }}
      preserveAspectRatio="none" viewBox="0 0 400 36"
    >
      <path
        d="M0,18 C33,0 66,36 100,18 C133,0 166,36 200,18 C233,0 266,36 300,18 C333,0 366,36 400,18 L400,36 L0,36 Z"
        fill={color1}
        className="water-svg-w1"
      />
      <path
        d="M0,24 C33,6 66,42 100,24 C133,6 166,42 200,24 C233,6 266,42 300,24 C333,6 366,42 400,24 L400,36 L0,36 Z"
        fill={color2}
        className="water-svg-w2"
      />
    </svg>
  );
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
    const id = ++rippleId.current;
    setRipples(r => [...r, id]);
    setTimeout(() => setRipples(r => r.filter(x => x !== id)), 800);
  }, [goalMl]);

  const removeGlass = useCallback(() => {
    setIntake(v => Math.max(0, v - GLASS_ML));
    if (intake - GLASS_ML < goalMl) { setGoalReachedAnim(false); alreadyCelebrated.current = false; }
  }, [intake, goalMl]);

  const pct       = Math.min(100, Math.round((intake / goalMl) * 100));
  const liters    = (intake / 1000).toFixed(1);
  const goalL     = (goalMl / 1000).toFixed(1);
  const glasses   = Math.round(intake / GLASS_ML);
  const goalGlasses = Math.round(goalMl / GLASS_ML);
  const isEmpty   = intake === 0;
  const isLow     = pct < 30 && !isEmpty;

  /* wave sits at (100 - pct)% from top */
  const waveLevelPct = 100 - pct;

  const waveColor1 = goalReachedAnim ? 'rgba(255,255,255,0.5)' : '#38BDF8';
  const waveColor2 = goalReachedAnim ? 'rgba(255,255,255,0.25)' : 'rgba(14,165,233,0.7)';
  const fillColor  = goalReachedAnim
    ? 'rgba(255,255,255,0.25)'
    : 'linear-gradient(180deg,#38BDF8 0%,#0284C7 100%)';

  return (
    <>
      {/* ── Celebration overlay ── */}
      {celebrating && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', pointerEvents: 'none',
        }}>
          <div className="water-flood" />
          {Array.from({ length: 22 }).map((_, i) => (
            <div key={i} className="water-celebrate-bubble" style={{
              left: `${Math.random() * 90 + 5}%`,
              width: `${Math.random() * 14 + 6}px`,
              height: `${Math.random() * 14 + 6}px`,
              animationDuration: `${Math.random() * 1.5 + 1}s`,
              animationDelay: `${Math.random() * 2}s`,
            }} />
          ))}
          <div className="water-celebrate-msg">
            <Droplets size={56} color="white" style={{ marginBottom: 16 }} />
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
      <div className={isEmpty ? 'water-card-remind' : ''} style={{
        background: goalReachedAnim
          ? 'linear-gradient(135deg,#0EA5E9 0%,#0369A1 100%)'
          : 'linear-gradient(160deg, #0F172A 0%, #0C1A2E 100%)',
        borderRadius: 22,
        padding: '20px 20px 18px',
        border: isEmpty
          ? '1.5px solid rgba(56,189,248,0.5)'
          : goalReachedAnim
            ? 'none'
            : '1px solid rgba(56,189,248,0.2)',
        marginBottom: 16,
        transition: 'all 0.6s ease',
        position: 'relative', overflow: 'hidden',
        boxShadow: isEmpty
          ? '0 0 0 0 rgba(56,189,248,0.4)'
          : goalReachedAnim
            ? '0 8px 32px rgba(14,165,233,0.45)'
            : '0 4px 24px rgba(0,0,0,0.4)',
      }}>

        {/* Subtle background wave decoration */}
        <div style={{
          position: 'absolute', bottom: -20, left: -20, right: -20, height: 80,
          background: goalReachedAnim
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(56,189,248,0.06)',
          borderRadius: '60% 60% 0 0',
          pointerEvents: 'none',
        }} />

        {/* ── Reminder banner when empty ── */}
        {isEmpty && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(56,189,248,0.15)',
            border: '1px solid rgba(56,189,248,0.3)',
            borderRadius: 10, padding: '7px 12px',
            marginBottom: 14,
          }}>
            <Droplets size={16} color="#38BDF8" />
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#38BDF8' }}>
              Lembrou de beber água hoje? Anota agora!
            </p>
          </div>
        )}

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: goalReachedAnim
                ? 'rgba(255,255,255,0.25)'
                : 'rgba(56,189,248,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {goalReachedAnim
                ? <Trophy size={19} color="white" fill="white" />
                : <Droplets size={19} color="#38BDF8" />
              }
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'white' }}>
                {goalReachedAnim ? 'Meta atingida' : 'Hidratação'}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                meta: {goalGlasses} copos · {goalL}L
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-0.5px' }}>
              {liters}L
            </p>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>
              de {goalL}L
            </p>
          </div>
        </div>

        {/* ── Main visual ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>

          {/* Circle with SVG wave */}
          <div style={{
            width: 112, height: 112,
            borderRadius: '50%',
            position: 'relative', flexShrink: 0,
            overflow: 'hidden',
            border: `3px solid ${goalReachedAnim ? 'rgba(255,255,255,0.35)' : 'rgba(56,189,248,0.35)'}`,
            background: goalReachedAnim ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.8)',
          }}>
            {/* Water fill body */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: `${pct}%`,
              background: fillColor,
              transition: 'height 0.7s cubic-bezier(0.34,1.56,0.64,1)',
              overflow: 'visible',
            }}>
              {/* SVG sine wave on top of fill */}
              {pct < 100 && <WaveSVG color1={waveColor1} color2={waveColor2} />}
            </div>

            {/* % label */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontSize: 24, fontWeight: 900, lineHeight: 1,
                color: pct > 55 ? 'white' : 'rgba(255,255,255,0.85)',
                textShadow: '0 1px 6px rgba(0,0,0,0.4)',
              }}>
                {pct}%
              </span>
              {isEmpty && (
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
                  vazio
                </span>
              )}
            </div>
          </div>

          {/* Right: cup dots + status */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Cup dots grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
              {Array.from({ length: goalGlasses }).map((_, i) => (
                <div key={i} style={{
                  width: 22, height: 30, borderRadius: 6,
                  background: i < glasses
                    ? (goalReachedAnim ? 'rgba(255,255,255,0.7)' : 'linear-gradient(180deg,#38BDF8,#0284C7)')
                    : 'rgba(255,255,255,0.08)',
                  border: i < glasses ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  position: 'relative', overflow: 'hidden',
                  transition: 'background 0.3s ease',
                }}>
                  {i < glasses && (
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
                      background: goalReachedAnim ? 'rgba(255,255,255,0.3)' : 'rgba(2,132,199,0.5)',
                      borderRadius: '0 0 6px 6px',
                    }} />
                  )}
                </div>
              ))}
            </div>

            <p style={{ margin: '0 0 6px', fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
              {glasses} de {goalGlasses} copos
            </p>

            {/* Status text */}
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: isEmpty ? '#38BDF8' : isLow ? '#FBBF24' : '#34D399' }}>
              {isEmpty
                ? '● Não registrado ainda'
                : isLow
                  ? `● ${goalGlasses - glasses} copos para a meta`
                  : goalReachedAnim
                    ? '● Meta do dia batida'
                    : `● ${goalGlasses - glasses} copo${goalGlasses - glasses !== 1 ? 's' : ''} restante${goalGlasses - glasses !== 1 ? 's' : ''}`
              }
            </p>
          </div>
        </div>

        {/* ── Controls ── */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={removeGlass} disabled={intake === 0}
            style={{
              width: 44, height: 44, borderRadius: 13, border: 'none',
              cursor: intake === 0 ? 'default' : 'pointer',
              background: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: intake === 0 ? 0.35 : 1, flexShrink: 0,
              transition: 'all 0.15s',
            }}>
            <Minus size={17} />
          </button>

          <button onClick={addGlass}
            className={isEmpty ? 'water-btn-pulse' : ''}
            style={{
              flex: 1, height: 44, borderRadius: 13, border: 'none', cursor: 'pointer',
              background: goalReachedAnim
                ? 'rgba(255,255,255,0.25)'
                : 'linear-gradient(135deg,#38BDF8,#0284C7)',
              color: 'white', fontSize: 14, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: goalReachedAnim ? 'none' : '0 4px 18px rgba(2,132,199,0.5)',
              position: 'relative', overflow: 'hidden', transition: 'all 0.15s',
            }}>
            {ripples.map(id => (
              <span key={id} className="water-btn-ripple" />
            ))}
            <Plus size={17} />
            + 1 copo (250ml)
          </button>
        </div>
      </div>

      <style>{`
        /* ── SVG waves ── */
        .water-svg-w1 {
          animation: waveMoveA 2.2s linear infinite;
        }
        .water-svg-w2 {
          animation: waveMoveB 3s linear infinite;
        }
        @keyframes waveMoveA {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes waveMoveB {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }

        /* ── Card pulse when empty ── */
        .water-card-remind {
          animation: cardRemind 3s ease-in-out infinite;
        }
        @keyframes cardRemind {
          0%, 100% { box-shadow: 0 4px 24px rgba(0,0,0,0.4); }
          50%       { box-shadow: 0 0 0 6px rgba(56,189,248,0.2), 0 4px 24px rgba(0,0,0,0.4); }
        }

        /* ── Add button pulse when empty ── */
        .water-btn-pulse {
          animation: btnGlow 2s ease-in-out infinite;
        }
        @keyframes btnGlow {
          0%, 100% { box-shadow: 0 4px 18px rgba(2,132,199,0.5); }
          50%       { box-shadow: 0 4px 28px rgba(56,189,248,0.85), 0 0 0 4px rgba(56,189,248,0.2); }
        }

        /* ── Ripple on add button ── */
        .water-btn-ripple {
          position: absolute;
          width: 10px; height: 10px;
          border-radius: 50%;
          background: rgba(255,255,255,0.55);
          animation: btnRipple 0.7s ease-out forwards;
          pointer-events: none;
        }
        @keyframes btnRipple {
          0%   { transform: scale(0); opacity: 1; }
          100% { transform: scale(14); opacity: 0; }
        }

        /* ── Celebration ── */
        .water-flood {
          position: fixed; bottom: -10%; left: 0; right: 0;
          height: 120%;
          background: linear-gradient(180deg,#0EA5E9 0%,#0369A1 100%);
          animation: floodRise 1.4s cubic-bezier(0.22,1,0.36,1) forwards;
          border-radius: 50% 50% 0 0 / 10% 10% 0 0;
        }
        @keyframes floodRise {
          0%   { transform: translateY(100%); opacity: 0.9; }
          60%  { transform: translateY(0%); opacity: 1; }
          80%  { transform: translateY(5%); }
          100% { transform: translateY(0%); opacity: 0; }
        }
        .water-celebrate-bubble {
          position: fixed; border-radius: 50%;
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
