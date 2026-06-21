import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Dumbbell, User, Zap, TrendingUp, Timer } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/* ─── CSS ────────────────────────────────────────────────────── */
const CSS = `
  @keyframes spin    { from{transform:rotate(0deg)}  to{transform:rotate(360deg)} }
  @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes fadeInUp {
    from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)}
  }
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes formIn  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes cardPop { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
  @keyframes heroIn  { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
  @keyframes float1  { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-14px) rotate(4deg)} }
  @keyframes float2  { 0%,100%{transform:translateY(0) rotate(2deg)}  50%{transform:translateY(12px) rotate(-5deg)} }
  @keyframes float3  { 0%,100%{transform:translateY(0) scale(1)}      50%{transform:translateY(-10px) scale(1.06)} }
  @keyframes aurora1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(8%,-10%) scale(1.08)} 66%{transform:translate(-5%,7%) scale(0.94)} }
  @keyframes aurora2 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-9%,5%) scale(1.1)}   70%{transform:translate(7%,-8%) scale(0.92)} }
  @keyframes aurora3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(5%,9%) scale(1.06)} }
  @keyframes pulseDot { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.5);opacity:1} }
  @keyframes sweep   { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes ringDraw { from{stroke-dashoffset:534} to{stroke-dashoffset:100} }
  @keyframes glowGreen { 0%,100%{box-shadow:0 0 22px rgba(16,185,129,0.45)} 50%{box-shadow:0 0 44px rgba(16,185,129,0.75),0 0 70px rgba(16,185,129,0.3)} }
  @keyframes glowBlue  { 0%,100%{box-shadow:0 0 22px rgba(59,130,246,0.45)}  50%{box-shadow:0 0 44px rgba(59,130,246,0.75),0 0 70px rgba(59,130,246,0.3)} }

  /* ── role button fx ── */
  @keyframes liquidFill {
    from { clip-path: inset(100% 0 0 0 round 22px); }
    to   { clip-path: inset(0%   0 0 0 round 22px); }
  }
  @keyframes shimmer { from{transform:translateX(-150%)} to{transform:translateX(420%)} }
  @keyframes neonGreen {
    0%,100% { box-shadow:0 0 18px rgba(16,185,129,0.55),0 0 40px rgba(16,185,129,0.3),0 0 70px rgba(16,185,129,0.12); }
    50%     { box-shadow:0 0 32px rgba(16,185,129,0.9), 0 0 70px rgba(16,185,129,0.6),0 0 110px rgba(16,185,129,0.22); }
  }
  @keyframes neonBlue {
    0%,100% { box-shadow:0 0 18px rgba(59,130,246,0.55),0 0 40px rgba(59,130,246,0.3),0 0 70px rgba(59,130,246,0.12); }
    50%     { box-shadow:0 0 32px rgba(59,130,246,0.9), 0 0 70px rgba(59,130,246,0.6),0 0 110px rgba(59,130,246,0.22); }
  }
  @keyframes iconSpin {
    0%  { transform:scale(0.3) rotate(-200deg); opacity:0; }
    55% { transform:scale(1.3) rotate(12deg);   opacity:1; }
    80% { transform:scale(0.9) rotate(-5deg); }
    100%{ transform:scale(1)   rotate(0deg); }
  }
  @keyframes spark0 { to{ opacity:0; transform:translate(-32px,-26px) scale(0.1); } }
  @keyframes spark1 { to{ opacity:0; transform:translate(0,-38px)     scale(0.1); } }
  @keyframes spark2 { to{ opacity:0; transform:translate(32px,-26px)  scale(0.1); } }
  @keyframes spark3 { to{ opacity:0; transform:translate(38px,4px)    scale(0.1); } }
  @keyframes spark4 { to{ opacity:0; transform:translate(24px,30px)   scale(0.1); } }
  @keyframes spark5 { to{ opacity:0; transform:translate(-24px,30px)  scale(0.1); } }
  @keyframes spark6 { to{ opacity:0; transform:translate(-38px,4px)   scale(0.1); } }

  .btn-submit {
    transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-submit:hover:not(:disabled) { transform:translateY(-2px) scale(1.01); }
  .btn-submit:active:not(:disabled){ transform:scale(0.97); }

  .login-mobile  { display:flex!important; }
  .login-desktop { display:none!important; }
  @media (min-width:800px) {
    .login-mobile  { display:none!important; }
    .login-desktop { display:flex!important; }
  }
`;

/* ─── Typewriter ──────────────────────────────────────────────── */
const PHRASES = [
  'Seu treino de hoje te espera 💪',
  'Cada repetição conta',
  'Você evoluiu. Prove isso.',
  'Consistência > Intensidade.',
];
function useTypewriter() {
  const [text, setText] = useState('');
  const [idx, setIdx]   = useState(0);
  const [mode, setMode] = useState('type');
  const t = useRef(null);
  useEffect(() => {
    const p = PHRASES[idx];
    if (mode === 'type') {
      if (text.length < p.length) t.current = setTimeout(() => setText(p.slice(0, text.length + 1)), 50);
      else t.current = setTimeout(() => setMode('pause'), 2200);
    } else if (mode === 'pause') {
      t.current = setTimeout(() => setMode('erase'), 100);
    } else {
      if (text.length > 0) t.current = setTimeout(() => setText(s => s.slice(0, -1)), 22);
      else { setIdx(i => (i + 1) % PHRASES.length); setMode('type'); }
    }
    return () => clearTimeout(t.current);
  }, [text, mode, idx]);
  return text;
}

/* ─── FitnessRing ─────────────────────────────────────────────── */
function FitnessRing({ pct = 78 }) {
  const r = 80, circ = 2 * Math.PI * r, dash = circ * (pct / 100);
  return (
    <div style={{ position: 'relative', width: 200, height: 200 }}>
      <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" /><stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r={r} fill="none" stroke="#E5E7EB" strokeWidth="10" />
        <circle cx="100" cy="100" r={r} fill="none" stroke="url(#rg)" strokeWidth="10"
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
          style={{ animation: 'ringDraw 1.8s cubic-bezier(0.4,0,0.2,1) 0.3s both' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.8s ease 1s both' }}>
        <span style={{ fontSize: 36, fontWeight: 900, color: '#111827', letterSpacing: '-2px', lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginTop: 2 }}>da semana</span>
      </div>
    </div>
  );
}

/* ─── RoleToggle (top-level — never re-mounts) ────────────────── */
function RoleToggle({ role, switchRole, isStudent, accent, accentGrad, bg, border, textOff, textOn }) {
  return (
    <div style={{ position: 'relative', display: 'flex', background: bg, borderRadius: 100, padding: 4, border, width: '100%' }}>
      <div style={{
        position: 'absolute', top: 4, bottom: 4,
        left: isStudent ? 4 : '50%',
        width: 'calc(50% - 4px)', borderRadius: 100,
        background: accentGrad, boxShadow: `0 4px 16px ${accent}55`,
        transition: 'left 0.4s cubic-bezier(0.34,1.56,0.64,1), background 0.35s, box-shadow 0.35s',
        pointerEvents: 'none',
      }} />
      {[{ r: 'student', label: 'Aluno', Icon: User }, { r: 'personal', label: 'Personal', Icon: Dumbbell }].map(({ r, label, Icon }) => (
        <button key={r} onClick={() => switchRole(r)}
          style={{
            flex: 1, position: 'relative', zIndex: 1,
            border: 'none', background: 'none', cursor: 'pointer',
            padding: '11px 0', minHeight: 44, borderRadius: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 14, fontWeight: role === r ? 800 : 500,
            color: role === r ? textOn : textOff,
            transition: 'color 0.3s', WebkitTapHighlightColor: 'transparent',
          }}>
          <Icon size={14} />{label}
        </button>
      ))}
    </div>
  );
}

/* ─── LoginForm (top-level — inputs nunca perdem foco) ────────── */
function LoginForm({ formKey, email, setEmail, password, setPassword, showPass, setShowPass, error, loading, accent, accentGrad, isStudent, onSubmit }) {
  return (
    <form key={formKey} onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 12px', animation: 'fadeInUp 0.3s ease both' }}>
          <AlertCircle size={14} color="#EF4444" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#DC2626' }}>{error}</span>
        </div>
      )}

      <div style={{ animation: 'formIn 0.4s ease 0.05s both' }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="seu@email.com" required autoComplete="email"
          className="input-light"
          style={{ width: '100%', padding: '13px 14px', borderRadius: 12, fontSize: 15, boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
          onFocus={e => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}1A`; }}
          onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
        />
      </div>

      <div style={{ animation: 'formIn 0.4s ease 0.1s both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Senha</label>
          <Link to="/esqueci-senha" style={{ fontSize: 12, color: '#9CA3AF', textDecoration: 'none', fontWeight: 500 }}>Esqueceu?</Link>
        </div>
        <div style={{ position: 'relative' }}>
          <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" required autoComplete="current-password"
            className="input-light"
            style={{ width: '100%', padding: '13px 44px 13px 14px', borderRadius: 12, fontSize: 15, boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
            onFocus={e => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}1A`; }}
            onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
          />
          <button type="button" onClick={() => setShowPass(v => !v)}
            style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 0, WebkitTapHighlightColor: 'transparent' }}>
            {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-submit"
        style={{
          width: '100%', padding: '15px', borderRadius: 13, border: 'none',
          background: accentGrad, color: 'white', fontSize: 15, fontWeight: 800,
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          letterSpacing: '-0.2px', marginTop: 4,
          boxShadow: `0 8px 24px ${accent}45`, opacity: loading ? 0.8 : 1,
          transition: 'background 0.35s, box-shadow 0.35s',
          animation: 'formIn 0.4s ease 0.15s both',
        }}>
        {loading
          ? <><div style={{ width: 17, height: 17, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Entrando...</>
          : isStudent ? 'Acessar meus treinos' : 'Acessar painel'
        }
      </button>
    </form>
  );
}

/* ─── Main ────────────────────────────────────────────────────── */
export default function StudentLogin() {
  const [role, setRole]         = useState('student');
  const [formKey, setFormKey]   = useState(0);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [touch, setTouch]       = useState({ x: 0, y: 0 });
  const [mouse, setMouse]       = useState({ x: 0, y: 0 });
  const heroRef  = useRef(null);
  const { login } = useAuth();
  const navigate   = useNavigate();
  const typeText   = useTypewriter();

  const isStudent  = role === 'student';
  const accent     = isStudent ? '#10B981' : '#3B82F6';
  const accentGrad = isStudent
    ? 'linear-gradient(135deg,#10B981,#059669)'
    : 'linear-gradient(135deg,#3B82F6,#6366F1)';

  const switchRole = (r) => {
    if (r === role) return;
    setRole(r);
    setFormKey(k => k + 1);
    setError('');
  };

  useEffect(() => {
    const h = (e) => {
      if (!e.touches.length) return;
      setTouch({ x: (e.touches[0].clientX / window.innerWidth - 0.5) * 2, y: (e.touches[0].clientY / window.innerHeight - 0.5) * 2 });
    };
    window.addEventListener('touchmove', h, { passive: true });
    return () => window.removeEventListener('touchmove', h);
  }, []);

  useEffect(() => {
    const el = heroRef.current; if (!el) return;
    const h = (e) => {
      const r = el.getBoundingClientRect();
      setMouse({ x: ((e.clientX - r.left) / r.width - 0.5) * 2, y: ((e.clientY - r.top) / r.height - 0.5) * 2 });
    };
    el.addEventListener('mousemove', h);
    return () => el.removeEventListener('mousemove', h);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      if (result.role === 'student')   navigate('/aluno/dashboard');
      else if (result.role === 'personal') navigate('/dashboard');
      else setError('Papel não reconhecido.');
    } else {
      setError(result.error || 'Email ou senha incorretos.');
    }
  };

  const formProps = { formKey, email, setEmail, password, setPassword, showPass, setShowPass, error, loading, accent, accentGrad, isStudent, onSubmit: handleSubmit };
  const toggleProps = { role, switchRole, isStudent, accent, accentGrad };
  const tx = touch.x, ty = touch.y;

  const SPARKS = [
    'spark0','spark1','spark2','spark3','spark4','spark5','spark6',
  ];

  return (
    <>
      <style>{CSS}</style>

      {/* ══ MOBILE ══════════════════════════════════════════════ */}
      <div className="login-mobile" style={{ minHeight: '100dvh', flexDirection: 'column', position: 'relative', overflow: 'hidden', background: '#080C17' }}>

        {/* Aurora blobs */}
        <div style={{ position: 'absolute', top: '-25%', left: '-20%', width: '75%', height: '75%', borderRadius: '50%', background: `radial-gradient(circle, ${isStudent ? 'rgba(16,185,129,0.28)' : 'rgba(59,130,246,0.28)'} 0%, transparent 65%)`, filter: 'blur(55px)', animation: 'aurora1 13s ease-in-out infinite', transition: 'background 0.8s ease', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '25%', right: '-15%', width: '60%', height: '60%', borderRadius: '50%', background: `radial-gradient(circle, ${isStudent ? 'rgba(5,150,105,0.18)' : 'rgba(99,102,241,0.22)'} 0%, transparent 65%)`, filter: 'blur(48px)', animation: 'aurora2 17s ease-in-out infinite', transition: 'background 0.8s ease', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '35%', right: '0%', width: '45%', height: '45%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.13) 0%, transparent 65%)', filter: 'blur(40px)', animation: 'aurora3 11s ease-in-out infinite', pointerEvents: 'none' }} />

        {/* Floating icons w/ touch parallax */}
        <div style={{ position: 'absolute', top: '9%', right: '10%', animation: 'float1 5s ease-in-out infinite', transform: `translate(${tx*14}px,${ty*9}px)`, transition: 'transform 0.7s ease-out', pointerEvents: 'none' }}>
          <div style={{ width: 50, height: 50, borderRadius: 15, background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Dumbbell size={22} color={accent} style={{ transition: 'color 0.4s' }} />
          </div>
        </div>
        <div style={{ position: 'absolute', top: '20%', left: '6%', animation: 'float2 6.5s ease-in-out infinite 1s', transform: `translate(${tx*-11}px,${ty*13}px)`, transition: 'transform 0.8s ease-out', pointerEvents: 'none' }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={19} color="#8B5CF6" />
          </div>
        </div>
        <div style={{ position: 'absolute', top: '31%', right: '4%', animation: 'float3 7s ease-in-out infinite 2s', transform: `translate(${tx*9}px,${ty*-11}px)`, transition: 'transform 0.6s ease-out', pointerEvents: 'none' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Timer size={17} color="#F59E0B" />
          </div>
        </div>

        {/* Top content */}
        <div style={{ padding: 'max(52px,env(safe-area-inset-top)) 24px 0', position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, animation: 'fadeInUp 0.55s ease both' }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: isStudent ? 'glowGreen 3s ease-in-out infinite' : 'glowBlue 3s ease-in-out infinite', transition: 'background 0.45s ease' }}>
              <Zap size={22} color="white" fill="white" />
            </div>
            <span style={{ fontSize: 26, fontWeight: 900, color: 'white', letterSpacing: '-0.8px' }}>WAY FIT</span>
          </div>

          {/* Headline */}
          <h1 style={{ margin: '0 0 6px', fontSize: 32, fontWeight: 900, color: 'white', letterSpacing: '-1.2px', textAlign: 'center', lineHeight: 1.1, animation: 'fadeInUp 0.55s ease 0.08s both' }}>
            Treine com{' '}
            <span style={{ background: accentGrad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200%', animation: 'sweep 3s linear infinite', transition: 'background 0.45s' }}>
              inteligência
            </span>
          </h1>

          {/* Typewriter */}
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', margin: '0 0 28px', textAlign: 'center', minHeight: 20, animation: 'fadeIn 0.55s ease 0.2s both' }}>
            {typeText}
            <span style={{ display: 'inline-block', width: 2, height: '1em', background: accent, marginLeft: 2, verticalAlign: 'text-bottom', animation: 'blink 1s step-end infinite', transition: 'background 0.4s' }} />
          </p>

          {/* Role buttons */}
          <div style={{ display: 'flex', gap: 14, width: '100%', position: 'relative', animation: 'fadeInUp 0.6s ease 0.28s both' }}>

            {/* Sliding glow orb */}
            <div style={{ position: 'absolute', bottom: -14, left: isStudent ? '25%' : '75%', transform: 'translateX(-50%)', width: 110, height: 55, borderRadius: '50%', background: isStudent ? 'rgba(16,185,129,0.6)' : 'rgba(59,130,246,0.6)', filter: 'blur(24px)', transition: 'left 0.45s cubic-bezier(0.34,1.56,0.64,1), background 0.4s', pointerEvents: 'none', zIndex: 0 }} />

            {[
              { r: 'student',  label: 'Aluno',    sub: 'Seus treinos',  Icon: User,     grad: 'linear-gradient(135deg,#10B981,#059669)', color: '#10B981', neon: 'neonGreen 2.2s ease-in-out infinite' },
              { r: 'personal', label: 'Personal', sub: 'Painel pro',    Icon: Dumbbell, grad: 'linear-gradient(135deg,#3B82F6,#6366F1)', color: '#3B82F6', neon: 'neonBlue  2.2s ease-in-out infinite' },
            ].map(({ r, label, sub, Icon, grad, color, neon }) => {
              const active = role === r;
              return (
                <button key={r} onClick={() => switchRole(r)}
                  style={{
                    flex: 1, padding: '22px 14px 20px', borderRadius: 22,
                    position: 'relative', overflow: 'hidden',
                    border: `1.5px solid ${active ? 'transparent' : color + '38'}`,
                    background: active ? 'transparent' : 'rgba(255,255,255,0.05)',
                    backdropFilter: active ? 'none' : 'blur(16px)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                    cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                    animation: active ? neon : 'none',
                    transform: active ? 'translateY(-5px) scale(1.05)' : 'scale(1)',
                    transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), border-color 0.35s, background 0.35s',
                    zIndex: 1,
                  }}>

                  {/* Liquid fill */}
                  {active && <div style={{ position: 'absolute', inset: 0, background: grad, animation: 'liquidFill 0.55s cubic-bezier(0.22,1,0.36,1) both', zIndex: 0 }} />}

                  {/* Shimmer */}
                  {active && <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '32%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)', animation: 'shimmer 2.8s ease-in-out infinite 0.8s', zIndex: 1, pointerEvents: 'none' }} />}

                  {/* Sparks — fixed keyframes, no CSS vars */}
                  {active && SPARKS.map((anim, i) => (
                    <div key={`${formKey}-${i}`} style={{ position: 'absolute', top: '40%', left: '50%', width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', marginLeft: -2, marginTop: -2, animation: `${anim} 0.7s ease-out ${i * 0.045}s both`, zIndex: 2, pointerEvents: 'none' }} />
                  ))}

                  {/* Content */}
                  <div style={{ position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <div key={`${r}-${active ? 'on' : 'off'}`} style={{ width: 58, height: 58, borderRadius: 18, background: active ? 'rgba(255,255,255,0.22)' : `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: active ? 'iconSpin 0.55s cubic-bezier(0.34,1.56,0.64,1) both' : 'none', transition: 'background 0.35s' }}>
                      <Icon size={27} color={active ? 'white' : color} style={{ transition: 'color 0.35s' }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: 19, fontWeight: 900, letterSpacing: '-0.4px', color: active ? 'white' : 'rgba(255,255,255,0.42)', transition: 'color 0.35s' }}>{label}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: active ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.24)', transition: 'color 0.35s' }}>{sub}</p>
                    </div>
                    {active && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[0, 0.2, 0.4].map((d, i) => (
                          <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', animation: `pulseDot 1.4s ease-in-out infinite ${d}s` }} />
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 24 }} />

        {/* Form card */}
        <div style={{ background: 'white', borderRadius: '30px 30px 0 0', padding: '10px 24px max(28px,env(safe-area-inset-bottom))', boxShadow: '0 -24px 80px rgba(0,0,0,0.45)', position: 'relative', zIndex: 3, animation: 'cardPop 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both' }}>
          <div style={{ width: 38, height: 4, borderRadius: 2, background: '#E5E7EB', margin: '8px auto 20px' }} />

          <div key={`mh-${role}`} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, animation: 'formIn 0.35s ease both' }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 18px ${accent}45`, transition: 'background 0.35s, box-shadow 0.35s', flexShrink: 0 }}>
              {isStudent ? <User size={20} color="white" /> : <Dumbbell size={20} color="white" />}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'color 0.35s' }}>
                {isStudent ? 'Área do Aluno' : 'Personal Trainer'}
              </p>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#111827', letterSpacing: '-0.4px' }}>Bem-vindo de volta</h2>
            </div>
          </div>

          <LoginForm {...formProps} />

          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#9CA3AF' }}>
            Sem conta?{' '}
            <Link to="/registro" style={{ color: accent, fontWeight: 700, textDecoration: 'none', transition: 'color 0.35s' }}>Cadastre-se grátis</Link>
          </p>
        </div>
      </div>

      {/* ══ DESKTOP ═════════════════════════════════════════════ */}
      <div className="login-desktop" style={{ minHeight: '100vh' }}>

        {/* Hero */}
        <div ref={heroRef} style={{ flex: '1 1 55%', position: 'relative', overflow: 'hidden', padding: '60px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#FAFAFA', minHeight: '100vh' }}>
          <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: '60%', height: '60%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(16,185,129,0.22) 0%,transparent 65%)', filter: 'blur(48px)', animation: 'aurora1 12s ease-in-out infinite', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '55%', height: '55%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,0.18) 0%,transparent 65%)', filter: 'blur(52px)', animation: 'aurora2 16s ease-in-out infinite', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '40%', right: '5%', width: '35%', height: '35%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.12) 0%,transparent 65%)', filter: 'blur(40px)', animation: 'aurora3 10s ease-in-out infinite', pointerEvents: 'none' }} />

          <div style={{ position: 'absolute', top: '12%', right: '12%', animation: 'float1 5s ease-in-out infinite', transform: `translate(${mouse.x*18}px,${mouse.y*12}px)`, transition: 'transform 0.4s ease-out' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'white', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Dumbbell size={24} color="#10B981" /></div>
          </div>
          <div style={{ position: 'absolute', bottom: '18%', left: '8%', animation: 'float2 7s ease-in-out infinite 1s', transform: `translate(${mouse.x*-14}px,${mouse.y*10}px)`, transition: 'transform 0.5s ease-out' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'white', boxShadow: '0 8px 20px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={22} color="#3B82F6" /></div>
          </div>
          <div style={{ position: 'absolute', top: '55%', right: '6%', animation: 'float3 6s ease-in-out infinite 2s', transform: `translate(${mouse.x*10}px,${mouse.y*-16}px)`, transition: 'transform 0.45s ease-out' }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: 'white', boxShadow: '0 6px 18px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Timer size={20} color="#8B5CF6" /></div>
          </div>

          <div style={{ position: 'relative', zIndex: 2, maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, animation: 'fadeInUp 0.6s ease both' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#10B981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(16,185,129,0.4)' }}>
                <Zap size={22} color="white" fill="white" />
              </div>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#111827', letterSpacing: '-0.5px' }}>WAY FIT</span>
            </div>

            <h1 style={{ margin: '0 0 16px', fontSize: 42, fontWeight: 900, color: '#111827', lineHeight: 1.1, letterSpacing: '-1.5px', animation: 'fadeInUp 0.6s ease 0.1s both' }}>
              Treine com{' '}
              <span style={{ background: 'linear-gradient(135deg,#10B981,#3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200%', animation: 'sweep 3s linear infinite' }}>
                inteligência
              </span>
            </h1>

            <p style={{ margin: '0 0 40px', fontSize: 17, color: '#6B7280', lineHeight: 1.6, minHeight: 28, animation: 'fadeInUp 0.6s ease 0.2s both' }}>
              {typeText}
              <span style={{ display: 'inline-block', width: 2, height: '1em', background: '#10B981', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'blink 1s step-end infinite' }} />
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 28, animation: 'fadeInUp 0.6s ease 0.35s both' }}>
              <div style={{ transform: `translate(${mouse.x*8}px,${mouse.y*6}px)`, transition: 'transform 0.5s ease-out' }}>
                <FitnessRing pct={78} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Treinos esta semana', value: '3 de 4', color: '#10B981' },
                  { label: 'Exercícios feitos',   value: '24',     color: '#3B82F6' },
                  { label: 'Evolução no supino',  value: '+15kg',  color: '#8B5CF6' },
                ].map((s, i) => (
                  <div key={i} style={{ animation: `fadeIn 0.5s ease ${0.5 + i * 0.1}s both` }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 900, color: s.color, letterSpacing: '-0.5px' }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Form side */}
        <div style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 56px', background: 'white', position: 'relative', animation: 'heroIn 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both' }}>
          <div style={{ position: 'absolute', left: 0, top: '10%', height: '80%', width: 1, background: 'linear-gradient(to bottom,transparent,#E5E7EB 20%,#E5E7EB 80%,transparent)' }} />

          <div style={{ maxWidth: 360, width: '100%', margin: '0 auto' }}>
            <div style={{ marginBottom: 28, animation: 'fadeInUp 0.6s ease 0.25s both' }}>
              <RoleToggle {...toggleProps} bg="#F3F4F6" border="none" textOff="#6B7280" textOn="white" />
            </div>

            <div key={`dh-${role}`} style={{ marginBottom: 28, animation: 'formIn 0.4s ease both' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 900, color: '#111827', letterSpacing: '-0.6px' }}>Bem-vindo de volta</h2>
              <p style={{ margin: 0, fontSize: 14, color: '#9CA3AF' }}>
                {isStudent ? 'Entre para acessar seus treinos e evolução' : 'Acesse o painel de gestão dos seus alunos'}
              </p>
            </div>

            <LoginForm {...formProps} />

            <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid #F3F4F6', animation: 'fadeIn 0.6s ease 0.8s both' }}>
              <p style={{ textAlign: 'center', fontSize: 13, color: '#9CA3AF', margin: 0 }}>
                Sem conta?{' '}
                <Link to="/registro" style={{ color: accent, fontWeight: 700, textDecoration: 'none', transition: 'color 0.35s' }}>Cadastre-se grátis</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
