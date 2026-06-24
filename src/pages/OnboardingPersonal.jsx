import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Dumbbell, Calendar, Users, BarChart2, Zap } from 'lucide-react';

const CSS = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes bounceIn {
    0%   { opacity: 0; transform: scale(0.3); }
    50%  { opacity: 1; transform: scale(1.1); }
    70%  { transform: scale(0.9); }
    100% { transform: scale(1); }
  }
  @keyframes float {
    0%,100% { transform: translateY(0) rotate(-1deg); }
    50%      { transform: translateY(-12px) rotate(1deg); }
  }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(40px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-40px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes progressFill {
    from { width: 0%; }
    to   { width: var(--target-w); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.8); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes checkPop {
    0%   { transform: scale(0); }
    60%  { transform: scale(1.3); }
    100% { transform: scale(1); }
  }
  @keyframes stagger1 { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes orbit {
    from { transform: rotate(0deg) translateX(44px) rotate(0deg); }
    to   { transform: rotate(360deg) translateX(44px) rotate(-360deg); }
  }
  @keyframes ripple {
    0%   { transform: scale(0.8); opacity: 0.8; }
    100% { transform: scale(2.4); opacity: 0; }
  }
`;

const STEPS = [
  {
    id: 'welcome',
    emoji: '⚡',
    title: 'Bem-vindo ao WAY FIT!',
    subtitle: 'A plataforma que vai mudar a forma como você gerencia seus alunos.',
    gradient: 'var(--accent)',
    glow: 'rgba(59,130,246,0.4)',
  },
  {
    id: 'students',
    emoji: '👥',
    title: 'Seus alunos, organizados',
    subtitle: 'Cadastre alunos, envie convites e tenha todos os dados em um só lugar.',
    gradient: 'linear-gradient(135deg, #10B981, #3B82F6)',
    glow: 'rgba(16,185,129,0.4)',
  },
  {
    id: 'workouts',
    emoji: '🏋️',
    title: 'Treinos profissionais',
    subtitle: 'Monte programas completos com exercícios, séries, cargas e vídeos — em minutos.',
    gradient: 'linear-gradient(135deg, #8B5CF6, #EF4444)',
    glow: 'rgba(139,92,246,0.4)',
  },
  {
    id: 'results',
    emoji: '📈',
    title: 'Veja a evolução real',
    subtitle: 'Acompanhe o que cada aluno executou, os pesos que usou e como está evoluindo.',
    gradient: 'linear-gradient(135deg, #F59E0B, #EF4444)',
    glow: 'rgba(245,158,11,0.4)',
  },
  {
    id: 'ready',
    emoji: '🚀',
    title: 'Você está pronto!',
    subtitle: 'Comece cadastrando seu primeiro aluno. O resto você aprende no caminho.',
    gradient: 'linear-gradient(135deg, #10B981, #3B82F6)',
    glow: 'rgba(16,185,129,0.5)',
  },
];

// Visual for each step
function StepVisual({ stepId, gradient }) {
  if (stepId === 'welcome') return (
    <div style={{ position: 'relative', width: 180, height: 180, margin: '0 auto' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', animation: 'ripple 2s ease-out infinite' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(59,130,246,0.1)', animation: 'ripple 2s ease-out infinite 0.5s' }} />
      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 60px rgba(59,130,246,0.5)', animation: 'float 3s ease-in-out infinite, bounceIn 0.7s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <Zap size={80} color="white" fill="white" />
      </div>
    </div>
  );

  if (stepId === 'students') return (
    <div style={{ position: 'relative', width: 220, height: 140, margin: '0 auto', animation: 'fadeIn 0.5s ease both' }}>
      {[
        { name: 'João S.', color: '#3B82F6', left: 0, top: 10, delay: '0s' },
        { name: 'Maria L.', color: '#10B981', left: 72, top: 0, delay: '0.15s' },
        { name: 'Carlos R.', color: '#8B5CF6', left: 144, top: 10, delay: '0.3s' },
      ].map(s => (
        <div key={s.name} style={{ position: 'absolute', left: s.left, top: s.top, textAlign: 'center', animation: `bounceIn 0.6s cubic-bezier(0.34,1.56,0.64,1) ${s.delay} both` }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: 'white', boxShadow: `0 8px 24px ${s.color}60`, border: '3px solid white' }}>
            {s.name[0]}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{s.name.split(' ')[0]}</p>
        </div>
      ))}
    </div>
  );

  if (stepId === 'workouts') return (
    <div style={{ width: '100%', maxWidth: 280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[
        { name: 'Supino Reto com Barra', sets: '4×10', load: '80kg', delay: '0s' },
        { name: 'Crucifixo Inclinado', sets: '3×12', load: '20kg', delay: '0.15s' },
        { name: 'Peck Deck', sets: '3×15', load: '45kg', delay: '0.3s' },
      ].map((ex, i) => (
        <div key={i} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', animation: `slideInRight 0.5s ease ${ex.delay} both` }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #8B5CF6, #EF4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Dumbbell size={15} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</p>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{ex.sets}</p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: 8 }}>{ex.load}</span>
        </div>
      ))}
    </div>
  );

  if (stepId === 'results') return (
    <div style={{ width: '100%', maxWidth: 260, margin: '0 auto', animation: 'scaleIn 0.5s ease both' }}>
      <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: '16px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
        <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Evolução João · Supino</p>
        {[
          { week: 'Semana 1', load: '60kg', w: '40%', delay: '0s' },
          { week: 'Semana 2', load: '65kg', w: '55%', delay: '0.1s' },
          { week: 'Semana 3', load: '70kg', w: '70%', delay: '0.2s' },
          { week: 'Semana 4', load: '75kg', w: '85%', delay: '0.3s' },
        ].map((row, i) => (
          <div key={i} style={{ marginBottom: 10, animation: `slideInLeft 0.5s ease ${row.delay} both` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{row.week}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#F59E0B' }}>{row.load}</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: row.w, background: 'linear-gradient(90deg, #F59E0B, #EF4444)', borderRadius: 3, transition: 'width 0.8s ease' }} />
            </div>
          </div>
        ))}
        <p style={{ margin: '12px 0 0', fontSize: 13, fontWeight: 800, color: '#10B981', textAlign: 'center' }}>+25% em 4 semanas 🔥</p>
      </div>
    </div>
  );

  if (stepId === 'ready') return (
    <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', animation: 'ripple 2s ease-out infinite' }} />
      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 60px rgba(16,185,129,0.5)', animation: 'bounceIn 0.7s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <Check size={72} color="white" strokeWidth={3} />
      </div>
    </div>
  );

  return null;
}

export default function OnboardingPersonal() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  const next = () => {
    if (isLast) {
      localStorage.setItem('pt_onboarded', '1');
      navigate('/dashboard');
      return;
    }
    setStep(s => s + 1);
    setAnimKey(k => k + 1);
  };

  const skip = () => {
    localStorage.setItem('pt_onboarded', '1');
    navigate('/dashboard');
  };

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 30% 20%, #1E3A5F 0%, #0F172A 50%, #1E1B4B 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Background blobs */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 360, height: 360, borderRadius: '50%', background: `radial-gradient(circle, ${current.glow} 0%, transparent 65%)`, transition: 'background 0.8s ease', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* Skip */}
        {!isLast && (
          <button onClick={skip} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 20, padding: '7px 14px', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer', zIndex: 10, backdropFilter: 'blur(8px)' }}>
            Pular →
          </button>
        )}

        {/* Progress bar */}
        <div style={{ width: '100%', maxWidth: 400, marginBottom: 32, position: 'relative', zIndex: 1 }}>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: current.gradient, borderRadius: 2, transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i <= step ? 'white' : 'rgba(255,255,255,0.2)', transition: 'background 0.3s ease, transform 0.3s ease', transform: i === step ? 'scale(1.4)' : 'scale(1)' }} />
            ))}
          </div>
        </div>

        {/* Content card */}
        <div key={animKey} style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1, animation: 'fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) both' }}>

          {/* Visual */}
          <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
            <StepVisual stepId={current.id} gradient={current.gradient} />
          </div>

          {/* Text */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h1 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: '-0.8px', lineHeight: 1.2, animation: 'fadeInUp 0.5s ease 0.1s both' }}>
              {current.title}
            </h1>
            <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, animation: 'fadeInUp 0.5s ease 0.2s both', maxWidth: 340, marginLeft: 'auto', marginRight: 'auto' }}>
              {current.subtitle}
            </p>
          </div>

          {/* CTA */}
          <button onClick={next}
            style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: current.gradient, color: 'white', fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '-0.3px', boxShadow: `0 8px 32px ${current.glow}`, animation: 'fadeInUp 0.5s ease 0.3s both', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 14px 40px ${current.glow}`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 8px 32px ${current.glow}`; }}>
            {isLast ? '🚀 Ir para o painel' : (
              <>Próximo <ChevronRight size={18} /></>
            )}
          </button>

          {/* Step label */}
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.25)', animation: 'fadeIn 0.5s ease 0.4s both' }}>
            {step + 1} de {STEPS.length}
          </p>
        </div>
      </div>
    </>
  );
}
