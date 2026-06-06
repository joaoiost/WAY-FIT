import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Dumbbell, Target, Scale } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const CSS = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes bounceIn {
    0%   { opacity: 0; transform: scale(0.4) rotate(-10deg); }
    60%  { opacity: 1; transform: scale(1.1) rotate(3deg); }
    80%  { transform: scale(0.95) rotate(-1deg); }
    100% { transform: scale(1) rotate(0); }
  }
  @keyframes float {
    0%,100% { transform: translateY(0); }
    50%      { transform: translateY(-10px); }
  }
  @keyframes ripple {
    0%   { transform: scale(0.9); opacity: 0.6; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes goalPop {
    from { opacity: 0; transform: scale(0.85) translateY(10px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
`;

const GOALS = [
  { value: 'Hipertrofia', label: 'Ganho de massa', emoji: '💪' },
  { value: 'Emagrecimento', label: 'Emagrecimento', emoji: '🔥' },
  { value: 'Condicionamento', label: 'Condicionamento físico', emoji: '⚡' },
  { value: 'Força', label: 'Ganho de força', emoji: '🏋️' },
  { value: 'Saúde', label: 'Saúde e bem-estar', emoji: '🌱' },
  { value: 'Reabilitação', label: 'Reabilitação', emoji: '🩺' },
];

export default function OnboardingAluno() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [studentRecord, setStudentRecord] = useState(null);

  const [goal, setGoal] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [saving, setSaving] = useState(false);

  const firstName = user?.name?.split(' ')[0] || 'Atleta';

  useEffect(() => {
    if (!user || !hasSupabase) return;
    supabase.from('students').select('id, goal, weight, height').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setStudentRecord(data);
          if (data.goal) setGoal(data.goal);
          if (data.weight) setWeight(String(data.weight));
          if (data.height) setHeight(String(data.height));
        }
      });
  }, [user?.id]);

  const next = () => {
    setStep(s => s + 1);
    setAnimKey(k => k + 1);
  };

  const finish = async () => {
    setSaving(true);
    if (hasSupabase && studentRecord) {
      await supabase.from('students').update({
        goal: goal || null,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseInt(height) : null,
        onboarded_at: new Date().toISOString(),
      }).eq('id', studentRecord.id);
    }
    // Fallback local para quando Supabase não está configurado
    localStorage.setItem(`aluno_onboarded_${user?.id}`, '1');
    setSaving(false);
    navigate('/aluno/dashboard');
  };

  const skip = () => {
    if (hasSupabase && studentRecord) {
      supabase.from('students').update({ onboarded_at: new Date().toISOString() }).eq('id', studentRecord.id);
    }
    localStorage.setItem(`aluno_onboarded_${user?.id}`, '1');
    navigate('/aluno/dashboard');
  };

  // ── Step 0: Welcome ──────────────────────────────────────
  const StepWelcome = () => (
    <div key="welcome" style={{ animation: 'fadeInUp 0.55s cubic-bezier(0.22,1,0.36,1) both' }}>
      <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 32px' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', animation: 'ripple 2.5s ease-out infinite' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', animation: 'ripple 2.5s ease-out infinite 0.7s' }} />
        <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 60px rgba(16,185,129,0.5)', animation: 'float 3s ease-in-out infinite, bounceIn 0.7s cubic-bezier(0.34,1.56,0.64,1) both' }}>
          <span style={{ fontSize: 72 }}>👋</span>
        </div>
      </div>

      <h1 style={{ margin: '0 0 12px', fontSize: 30, fontWeight: 900, color: 'white', letterSpacing: '-0.8px', textAlign: 'center', animation: 'fadeInUp 0.5s ease 0.15s both' }}>
        Olá, {firstName}!
      </h1>
      <p style={{ margin: '0 0 36px', fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, textAlign: 'center', animation: 'fadeInUp 0.5s ease 0.25s both' }}>
        Seja bem-vindo ao WAY FIT. Vamos configurar seu perfil para que seu personal possa acompanhar sua evolução.
      </p>

      <button onClick={next} style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 32px rgba(16,185,129,0.5)', animation: 'fadeInUp 0.5s ease 0.35s both', transition: 'transform 0.2s, box-shadow 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 40px rgba(16,185,129,0.6)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(16,185,129,0.5)'; }}>
        Vamos lá <ChevronRight size={18} />
      </button>
    </div>
  );

  // ── Step 1: Goal ─────────────────────────────────────────
  const StepGoal = () => (
    <div key="goal" style={{ animation: 'fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) both' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(139,92,246,0.5)', animation: 'bounceIn 0.6s ease both' }}>
          <Target size={28} color="white" />
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>Qual é o seu objetivo?</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>Isso ajuda seu personal a montar o treino ideal para você.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        {GOALS.map((g, i) => {
          const selected = goal === g.value;
          return (
            <button key={g.value} onClick={() => setGoal(g.value)}
              style={{ padding: '14px 12px', borderRadius: 14, border: `2px solid ${selected ? 'rgba(139,92,246,0.8)' : 'rgba(255,255,255,0.1)'}`, background: selected ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.2s ease', backdropFilter: 'blur(8px)', animation: `goalPop 0.4s ease ${i * 0.07}s both`, transform: selected ? 'scale(1.04)' : 'scale(1)' }}
              onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}>
              <span style={{ fontSize: 26 }}>{g.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: selected ? 'white' : 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 1.3 }}>{g.label}</span>
            </button>
          );
        })}
      </div>

      <button onClick={next}
        disabled={!goal}
        style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: goal ? 'linear-gradient(135deg, #8B5CF6, #3B82F6)' : 'rgba(255,255,255,0.1)', color: goal ? 'white' : 'rgba(255,255,255,0.3)', fontSize: 15, fontWeight: 800, cursor: goal ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s', boxShadow: goal ? '0 8px 24px rgba(139,92,246,0.4)' : 'none' }}>
        Próximo <ChevronRight size={17} />
      </button>

      <button onClick={next} style={{ width: '100%', marginTop: 10, padding: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
        Pular por agora
      </button>
    </div>
  );

  // ── Step 2: Physical data ─────────────────────────────────
  const StepData = () => (
    <div key="data" style={{ animation: 'fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) both' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg, #F59E0B, #EF4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(245,158,11,0.5)', animation: 'bounceIn 0.6s ease both' }}>
          <Scale size={28} color="white" />
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>Seus dados físicos</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>Opcional — ajuda seu personal a acompanhar sua evolução.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Peso atual (kg)</label>
          <input type="number" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} placeholder="Ex: 75.5"
            style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: 18, fontWeight: 700, outline: 'none', boxSizing: 'border-box', backdropFilter: 'blur(8px)', transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = 'rgba(245,158,11,0.8)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Altura (cm)</label>
          <input type="number" inputMode="numeric" value={height} onChange={e => setHeight(e.target.value)} placeholder="Ex: 178"
            style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: 18, fontWeight: 700, outline: 'none', boxSizing: 'border-box', backdropFilter: 'blur(8px)', transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = 'rgba(245,158,11,0.8)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'} />
        </div>
      </div>

      <button onClick={finish} disabled={saving}
        style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #F59E0B, #EF4444)', color: 'white', fontSize: 16, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 32px rgba(245,158,11,0.45)', transition: 'transform 0.2s, box-shadow 0.2s' }}
        onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 40px rgba(245,158,11,0.55)'; } }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(245,158,11,0.45)'; }}>
        {saving
          ? <><div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Salvando...</>
          : <>🏋️ Ver meu treino</>
        }
      </button>

      <button onClick={finish} style={{ width: '100%', marginTop: 10, padding: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
        Pular e ir para o app
      </button>
    </div>
  );

  const STEP_COMPONENTS = [<StepWelcome />, <StepGoal />, <StepData />];
  const PROGRESS_LABELS = ['Bem-vindo', 'Objetivo', 'Dados'];

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 30% 70%, #064E3B 0%, #0F172A 50%, #1E1B4B 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Blobs */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* Skip */}
        {step < 2 && (
          <button onClick={skip} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 20, padding: '7px 14px', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, cursor: 'pointer', zIndex: 10, backdropFilter: 'blur(8px)' }}>
            Pular tudo →
          </button>
        )}

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, position: 'relative', zIndex: 1, animation: 'fadeIn 0.5s ease both' }}>
          {PROGRESS_LABELS.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 4, background: i <= step ? '#10B981' : 'rgba(255,255,255,0.2)', transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)' }} />
            </div>
          ))}
        </div>

        {/* Content */}
        <div key={animKey} style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
          {STEP_COMPONENTS[step]}
        </div>

        {/* Logo at bottom */}
        <div style={{ position: 'absolute', bottom: 16, display: 'flex', alignItems: 'center', gap: 6, opacity: 0.25, zIndex: 1 }}>
          <Dumbbell size={14} color="white" />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'white', letterSpacing: '0.06em' }}>WAY FIT</span>
        </div>
      </div>
    </>
  );
}
