import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, AlertCircle, Dumbbell, User, ChevronLeft, Users, BarChart2, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/* ─── Global CSS ─────────────────────────────────────────────────── */
const CSS = `
  /* ── shared ── */
  @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
  @keyframes fadeInUp {
    from { opacity:0; transform:translateY(28px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }

  /* ── desktop hero ── */
  @keyframes blobMove {
    0%,100% { transform:translate(0,0) scale(1); }
    33%     { transform:translate(20px,-20px) scale(1.05); }
    66%     { transform:translate(-15px,15px) scale(0.95); }
  }
  @keyframes logoFloat {
    0%,100% { transform:translateY(0); }
    50%      { transform:translateY(-6px); }
  }
  @keyframes glowPulse {
    0%,100% { box-shadow:0 0 20px rgba(59,130,246,0.4); }
    50%      { box-shadow:0 0 44px rgba(139,92,246,0.7),0 0 72px rgba(59,130,246,0.3); }
  }

  /* ── mobile role cards ── */
  @keyframes cardSlideIn {
    from { opacity:0; transform:translateY(40px) scale(0.93); }
    to   { opacity:1; transform:translateY(0) scale(1); }
  }
  @keyframes cardSlideOut {
    from { opacity:1; transform:translateY(0) scale(1); }
    to   { opacity:0; transform:translateY(-40px) scale(0.93); }
  }
  @keyframes formUp {
    from { opacity:0; transform:translateY(60px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes rippleReveal {
    from { clip-path: circle(0% at var(--rx,50%) var(--ry,80%)); }
    to   { clip-path: circle(160% at var(--rx,50%) var(--ry,80%)); }
  }
  @keyframes float1 {
    0%,100% { transform:translateY(0) rotate(-2deg); }
    50%      { transform:translateY(-14px) rotate(3deg); }
  }
  @keyframes float2 {
    0%,100% { transform:translateY(0) rotate(2deg); }
    50%      { transform:translateY(12px) rotate(-4deg); }
  }
  @keyframes particle {
    0%   { transform:translateY(0) translateX(0); opacity:0.6; }
    50%  { opacity:1; }
    100% { transform:translateY(-80px) translateX(var(--px,10px)); opacity:0; }
  }
  @keyframes pulseDot {
    0%,100% { transform:scale(1); opacity:0.7; }
    50%     { transform:scale(1.5); opacity:1; }
  }
  @keyframes sweepText {
    0%   { background-position:-200% center; }
    100% { background-position:200% center; }
  }

  /* ── mobile layout classes ── */
  .m-only  { display:none!important; }
  .d-only  { display:flex!important; }

  @media (max-width: 800px) {
    .m-only { display:flex!important; }
    .d-only { display:none!important; }
  }

  /* ── desktop form button ── */
  .btn-desktop {
    transition: transform .18s ease, box-shadow .18s ease;
  }
  .btn-desktop:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 28px rgba(59,130,246,0.42)!important;
  }
  .btn-desktop:active:not(:disabled) { transform:translateY(0); }

  /* ── desktop role card ── */
  .d-role-card {
    cursor:pointer;
    transition: transform .25s cubic-bezier(0.34,1.56,0.64,1), box-shadow .25s ease;
    border: 2px solid transparent;
  }
  .d-role-card:hover { transform:translateY(-6px) scale(1.02); }
  .d-role-card.personal:hover {
    box-shadow: 0 24px 60px rgba(59,130,246,0.35);
    border-color: rgba(59,130,246,0.4);
  }
  .d-role-card.student:hover {
    box-shadow: 0 24px 60px rgba(16,185,129,0.35);
    border-color: rgba(16,185,129,0.4);
  }

  /* ── mobile role card ── */
  .m-role-card {
    cursor: pointer;
    transition: transform .2s cubic-bezier(0.34,1.56,0.64,1), box-shadow .2s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .m-role-card:active { transform: scale(0.97); }
`;

/* ─── Shared login form ───────────────────────────────────────────── */
function LoginForm({ role, onBack, accentColor, accentGrad, onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      if (result.role === 'personal') navigate('/dashboard');
      else if (result.role === 'student') navigate('/aluno/dashboard');
      else setError('Papel não reconhecido.');
    } else {
      setError(result.error || 'Email ou senha incorretos.');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 12px' }}>
          <AlertCircle size={14} color="#EF4444" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#DC2626' }}>{error}</span>
        </div>
      )}

      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required autoFocus
          style={{ width: '100%', padding: '12px 14px', borderRadius: 11, border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#F9FAFB', color: '#111827', WebkitTextFillColor: '#111827', transition: 'border-color .15s, background .15s' }}
          onFocus={e => { e.target.style.borderColor = accentColor; e.target.style.background = 'white'; e.target.style.boxShadow = `0 0 0 3px ${accentColor}1A`; e.target.style.color = '#111827'; e.target.style.webkitTextFillColor = '#111827'; }}
          onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.background = '#F9FAFB'; e.target.style.boxShadow = 'none'; }} />
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Senha</label>
          <Link to="/esqueci-senha" style={{ fontSize: 12, color: '#9CA3AF', textDecoration: 'none', fontWeight: 500 }}>Esqueceu?</Link>
        </div>
        <div style={{ position: 'relative' }}>
          <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
            style={{ width: '100%', padding: '12px 42px 12px 14px', borderRadius: 11, border: '1.5px solid #E5E7EB', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#F9FAFB', color: '#111827', WebkitTextFillColor: '#111827', transition: 'border-color .15s, background .15s' }}
            onFocus={e => { e.target.style.borderColor = accentColor; e.target.style.background = 'white'; e.target.style.boxShadow = `0 0 0 3px ${accentColor}1A`; e.target.style.color = '#111827'; e.target.style.webkitTextFillColor = '#111827'; }}
            onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.background = '#F9FAFB'; e.target.style.boxShadow = 'none'; }} />
          <button type="button" onClick={() => setShowPass(v => !v)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 0 }}>
            {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>

      <button type="submit" disabled={loading}
        style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: accentGrad, color: 'white', fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '-0.2px', marginTop: 2, boxShadow: `0 6px 20px ${accentColor}40`, opacity: loading ? 0.8 : 1, transition: 'transform .18s, box-shadow .18s' }}
        onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${accentColor}55`; } }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 6px 20px ${accentColor}40`; }}>
        {loading && <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />}
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
export default function Login() {
  const [role, setRole] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [ripple, setRipple] = useState(null); // { x, y, color }
  const [cardsLeaving, setCardsLeaving] = useState(false);
  const navigate = useNavigate();

  const isPersonal = role === 'personal';
  const accentColor = isPersonal ? '#3B82F6' : '#10B981';
  const accentGrad = isPersonal
    ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)'
    : 'linear-gradient(135deg, #10B981, #059669)';

  /* Mobile: tap on card → ripple → form */
  const selectRoleMobile = (r, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((rect.left + rect.right) / 2 / window.innerWidth) * 100;
    const y = ((rect.top + rect.bottom) / 2 / window.innerHeight) * 100;
    setCardsLeaving(true);
    setRipple({ x, y, color: r === 'personal' ? '#1E3A5F' : '#064E3B' });
    setRole(r);
    setTimeout(() => setFormVisible(true), 380);
  };

  /* Desktop: click → inline form */
  const selectRoleDesktop = (r) => {
    setRole(r);
    setTimeout(() => setFormVisible(true), 80);
  };

  const goBack = () => {
    setFormVisible(false);
    setCardsLeaving(false);
    setRipple(null);
    setTimeout(() => setRole(null), 300);
  };

  /* ══ MOBILE LAYOUT ════════════════════════════════════════════════ */
  const MobileLayout = () => (
    <div className="m-only" style={{ minHeight: '100dvh', flexDirection: 'column', position: 'relative', overflow: 'hidden', background: '#0F172A' }}>

      {/* Ripple overlay */}
      {ripple && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 5,
          background: ripple.color,
          '--rx': `${ripple.x}%`, '--ry': `${ripple.y}%`,
          animation: 'rippleReveal .55s cubic-bezier(0.4,0,0.2,1) both',
          animationFillMode: 'forwards',
        }} />
      )}

      {/* Background blobs */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 65%)', filter: 'blur(40px)', animation: 'blobMove 10s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 65%)', filter: 'blur(36px)', animation: 'blobMove 13s ease-in-out infinite reverse', pointerEvents: 'none' }} />

      {/* Particles */}
      {[
        { left: '15%', bottom: '30%', size: 5, color: '#3B82F6', delay: '0s',   px: '8px', dur: '4s' },
        { left: '70%', bottom: '20%', size: 4, color: '#10B981', delay: '1.2s', px: '-6px', dur: '5s' },
        { left: '40%', bottom: '15%', size: 6, color: '#8B5CF6', delay: '0.6s', px: '4px',  dur: '3.5s' },
        { left: '85%', bottom: '40%', size: 3, color: '#F59E0B', delay: '2s',   px: '-10px', dur: '4.5s' },
      ].map((p, i) => !role && (
        <div key={i} style={{ position: 'absolute', left: p.left, bottom: p.bottom, width: p.size, height: p.size, borderRadius: '50%', background: p.color, '--px': p.px, animation: `particle ${p.dur} ease-in-out infinite ${p.delay}`, pointerEvents: 'none' }} />
      ))}

      {/* SELECTION SCREEN */}
      {!role && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 0, position: 'relative', zIndex: 2 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, animation: 'fadeInUp .6s ease both' }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'glowPulse 3s ease-in-out infinite' }}>
              <Zap size={24} color="white" fill="white" />
            </div>
            <span style={{ fontSize: 30, fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>WAY FIT</span>
          </div>

          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 44, animation: 'fadeIn .6s ease .2s both', textAlign: 'center' }}>
            Como você quer entrar?
          </p>

          {/* Personal card */}
          <button className="m-role-card" onClick={e => selectRoleMobile('personal', e)}
            style={{ width: '100%', maxWidth: 360, padding: '24px 20px', borderRadius: 22, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: 18, marginBottom: 14, animation: 'cardSlideIn .55s cubic-bezier(0.34,1.2,0.64,1) .1s both', textAlign: 'left' }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg, #3B82F6, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 24px rgba(59,130,246,0.45)', animation: 'float1 4s ease-in-out infinite' }}>
              <Dumbbell size={28} color="white" />
            </div>
            <div>
              <p style={{ margin: '0 0 3px', fontSize: 18, fontWeight: 900, color: 'white', letterSpacing: '-0.3px' }}>Personal Trainer</p>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>Gerencie alunos, treinos e agenda</p>
            </div>
            <div style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ChevronLeft size={16} color="rgba(255,255,255,0.5)" style={{ transform: 'rotate(180deg)' }} />
            </div>
          </button>

          {/* Aluno card */}
          <button className="m-role-card" onClick={e => selectRoleMobile('student', e)}
            style={{ width: '100%', maxWidth: 360, padding: '24px 20px', borderRadius: 22, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: 18, animation: 'cardSlideIn .55s cubic-bezier(0.34,1.2,0.64,1) .25s both', textAlign: 'left' }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 24px rgba(16,185,129,0.45)', animation: 'float2 5s ease-in-out infinite 1s' }}>
              <User size={28} color="white" />
            </div>
            <div>
              <p style={{ margin: '0 0 3px', fontSize: 18, fontWeight: 900, color: 'white', letterSpacing: '-0.3px' }}>Aluno</p>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>Acesse seus treinos e evolução</p>
            </div>
            <div style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ChevronLeft size={16} color="rgba(255,255,255,0.5)" style={{ transform: 'rotate(180deg)' }} />
            </div>
          </button>

          <p style={{ marginTop: 28, fontSize: 13, color: 'rgba(255,255,255,0.3)', animation: 'fadeIn .6s ease .5s both', textAlign: 'center' }}>
            Sem conta?{' '}
            <Link to="/registro" style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700, textDecoration: 'none' }}>Cadastre-se grátis</Link>
          </p>
        </div>
      )}

      {/* FORM SCREEN (after role selected) */}
      {role && formVisible && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 24px', position: 'relative', zIndex: 10, animation: 'formUp .45s cubic-bezier(0.22,1,0.36,1) both' }}>

          {/* Back + role header */}
          <div style={{ paddingTop: 'max(52px, env(safe-area-inset-top))', paddingBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={goBack} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backdropFilter: 'blur(8px)' }}>
              <ChevronLeft size={18} color="white" />
            </button>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {isPersonal ? 'Personal Trainer' : 'Aluno'}
              </p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: 'white', letterSpacing: '-0.3px' }}>Bem-vindo de volta</p>
            </div>
          </div>

          {/* Big role icon */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 16px 40px ${accentColor}50`, animation: 'fadeInUp .5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              {isPersonal ? <Dumbbell size={38} color="white" /> : <User size={38} color="white" />}
            </div>
          </div>

          {/* White card with form */}
          <div style={{ background: 'white', borderRadius: 24, padding: '28px 22px', boxShadow: '0 -8px 60px rgba(0,0,0,0.3)', marginBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
            <LoginForm
              role={role}
              onBack={goBack}
              accentColor={accentColor}
              accentGrad={accentGrad}
            />

            <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #F3F4F6', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#9CA3AF' }}>
                {isPersonal
                  ? <>Sem conta?{' '}<Link to="/registro" style={{ color: '#3B82F6', fontWeight: 700, textDecoration: 'none' }}>Cadastre-se grátis</Link></>
                  : <>É personal?{' '}<button onClick={() => selectRoleDesktop('personal')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', fontWeight: 700, fontSize: 13, padding: 0 }}>Acesse aqui</button></>
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* ══ DESKTOP LAYOUT ═══════════════════════════════════════════════ */
  const DesktopLayout = () => (
    <div className="d-only" style={{ minHeight: '100vh', flexDirection: 'column' }}>
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 70% 10%, #1E3A5F 0%, #0F172A 45%, #1E1B4B 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '32px 20px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Blobs */}
        <div style={{ position: 'absolute', top: -140, right: -140, width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 65%)', animation: 'blobMove 8s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -120, left: -120, width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 65%)', animation: 'blobMove 11s ease-in-out infinite reverse', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: role ? 24 : 40, position: 'relative', zIndex: 1, animation: 'fadeInUp .6s ease both', transition: 'margin .4s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: role ? 0 : 12 }}>
            <div style={{ width: 50, height: 50, borderRadius: 15, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'logoFloat 3s ease-in-out infinite, glowPulse 3s ease-in-out infinite' }}>
              <Zap size={27} color="white" fill="white" />
            </div>
            <span style={{ fontSize: 34, fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>WAY FIT</span>
          </div>
          {!role && (
            <p style={{ margin: '8px 0 0', fontSize: 15, color: 'rgba(255,255,255,0.4)', animation: 'fadeIn .8s ease .3s both' }}>
              Como você quer entrar?
            </p>
          )}
        </div>

        {/* Role selector */}
        {!role && (
          <div style={{ width: '100%', maxWidth: 520, position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { r: 'personal', label: 'Personal Trainer', sub: 'Gerencie alunos, treinos e agenda', Icon: Dumbbell, grad: 'linear-gradient(135deg,#3B82F6,#6366F1)', glow: 'rgba(59,130,246,0.45)', cls: 'personal', delay: '.1s' },
                { r: 'student',  label: 'Aluno',            sub: 'Acesse seus treinos e evolução',   Icon: User,     grad: 'linear-gradient(135deg,#10B981,#059669)', glow: 'rgba(16,185,129,0.45)', cls: 'student',  delay: '.25s' },
              ].map(({ r, label, sub, Icon, grad, glow, cls, delay }) => (
                <button key={r} className={`d-role-card ${cls}`} onClick={() => selectRoleDesktop(r)}
                  style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)', borderRadius: 20, padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, border: '1px solid rgba(255,255,255,0.1)', animation: `cardSlideIn .55s cubic-bezier(0.34,1.2,0.64,1) ${delay} both` }}>
                  <div style={{ width: 60, height: 60, borderRadius: 18, background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${glow}`, animation: r === 'personal' ? 'float1 4s ease-in-out infinite' : 'float2 5s ease-in-out infinite 1s' }}>
                    <Icon size={28} color="white" />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800, color: 'white' }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{sub}</p>
                  </div>
                </button>
              ))}
            </div>
            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.3)', animation: 'fadeIn .6s ease .5s both' }}>
              Sem conta?{' '}
              <Link to="/registro" style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700, textDecoration: 'none' }}>Cadastre-se grátis</Link>
            </p>
          </div>
        )}

        {/* Desktop form */}
        {role && (
          <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1, animation: formVisible ? 'formUp .4s cubic-bezier(0.22,1,0.36,1) both' : 'none', opacity: formVisible ? 1 : 0 }}>
            <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 22, padding: '28px 26px', boxShadow: `0 32px 80px rgba(0,0,0,0.4), 0 0 60px ${accentColor}25` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
                <button onClick={goBack} style={{ width: 34, height: 34, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#E5E7EB'}
                  onMouseLeave={e => e.currentTarget.style.background = '#F3F4F6'}>
                  <ChevronLeft size={16} color="#6B7280" />
                </button>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {isPersonal ? 'Personal Trainer' : 'Aluno'}
                  </p>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>Bem-vindo de volta</h2>
                </div>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isPersonal ? <Dumbbell size={18} color="white" /> : <User size={18} color="white" />}
                </div>
              </div>

              <LoginForm role={role} onBack={goBack} accentColor={accentColor} accentGrad={accentGrad} />

              <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#9CA3AF' }}>
                {isPersonal
                  ? <>Sem conta?{' '}<Link to="/registro" style={{ color: '#3B82F6', fontWeight: 700, textDecoration: 'none' }}>Cadastre-se grátis</Link></>
                  : <>É personal?{' '}<button onClick={() => { setRole(null); setFormVisible(false); setTimeout(() => selectRoleDesktop('personal'), 50); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', fontWeight: 700, fontSize: 12, padding: 0 }}>Acesse aqui</button></>
                }
              </p>
            </div>
            <p style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
              <Link to="/termos" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Termos</Link>
              {' · '}
              <Link to="/privacidade" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Privacidade</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <style>{CSS}</style>
      <MobileLayout />
      <DesktopLayout />
    </>
  );
}
