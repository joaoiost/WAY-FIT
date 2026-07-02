import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Dumbbell, User, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const CSS = `
  @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }

  .login-mobile  { display:flex!important; }
  .login-desktop { display:none!important; }
  @media (min-width:800px) {
    .login-mobile  { display:none!important; }
    .login-desktop { display:flex!important; }
  }

  .input-clean {
    width:100%; padding:13px 14px; border-radius:10px;
    border:1.5px solid #E5E7EB; font-size:15px; outline:none;
    background:white; color:#111827; transition:border-color 0.18s, box-shadow 0.18s;
    box-sizing:border-box;
  }
  .input-clean:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(99,102,241,0.12); }

  .role-tab {
    flex:1; display:flex; align-items:center; justify-content:center; gap:6px;
    padding:10px 0; border:none; border-radius:8px; cursor:pointer;
    font-size:14px; font-weight:600; transition:background 0.2s, color 0.2s;
    background:transparent; color:#9CA3AF;
  }
  .role-tab.active { background:white; color:#111827; font-weight:700; box-shadow:0 1px 4px rgba(0,0,0,0.1); }
`;

const PHRASES = [
  'Seu treino de hoje te espera',
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
      if (text.length < p.length) t.current = setTimeout(() => setText(p.slice(0, text.length + 1)), 55);
      else t.current = setTimeout(() => setMode('pause'), 2400);
    } else if (mode === 'pause') {
      t.current = setTimeout(() => setMode('erase'), 100);
    } else {
      if (text.length > 0) t.current = setTimeout(() => setText(s => s.slice(0, -1)), 24);
      else { setIdx(i => (i + 1) % PHRASES.length); setMode('type'); }
    }
    return () => clearTimeout(t.current);
  }, [text, mode, idx]);
  return text;
}

function LoginForm({ formKey, email, setEmail, password, setPassword, showPass, setShowPass, error, loading, accent, isStudent, onSubmit }) {
  return (
    <form key={formKey} onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 12px', animation: 'fadeIn 0.25s ease both' }}>
          <AlertCircle size={14} color="#EF4444" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#DC2626' }}>{error}</span>
        </div>
      )}

      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="seu@email.com" required autoComplete="email"
          className="input-clean" />
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Senha</label>
          <Link to="/esqueci-senha" style={{ fontSize: 12, color: '#9CA3AF', textDecoration: 'none' }}>Esqueceu?</Link>
        </div>
        <div style={{ position: 'relative' }}>
          <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" required autoComplete="current-password"
            className="input-clean"
            style={{ paddingRight: 44 }} />
          <button type="button" onClick={() => setShowPass(v => !v)}
            style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 0 }}>
            {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>

      <button type="submit" disabled={loading}
        style={{
          width: '100%', padding: '14px', borderRadius: 10, border: 'none',
          background: accent, color: 'white', fontSize: 15, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: loading ? 0.75 : 1, marginTop: 4,
          transition: 'opacity 0.15s, transform 0.15s',
        }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
        {loading
          ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Entrando...</>
          : isStudent ? 'Acessar meus treinos' : 'Acessar painel'}
      </button>
    </form>
  );
}

export default function StudentLogin() {
  const [role, setRole]         = useState('student');
  const [formKey, setFormKey]   = useState(0);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const typeText   = useTypewriter();

  const isStudent  = role === 'student';
  const accent     = isStudent ? '#10B981' : '#6366F1';

  const switchRole = (r) => {
    if (r === role) return;
    setRole(r); setFormKey(k => k + 1); setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      if (result.role === 'student' && isStudent) {
        navigate('/aluno/dashboard');
      } else if (result.role === 'personal' && !isStudent) {
        navigate('/dashboard');
      } else if (result.role === 'personal' && isStudent) {
        setError('Esse email é de um personal trainer. Use a aba "Personal" para entrar.');
      } else if (result.role === 'student' && !isStudent) {
        setError('Esse email é de um aluno. Use a aba "Aluno" para entrar.');
      } else {
        setError('Papel não reconhecido.');
      }
    } else {
      setError(result.error || 'Email ou senha incorretos.');
    }
  };

  const formProps = { formKey, email, setEmail, password, setPassword, showPass, setShowPass, error, loading, accent, isStudent, onSubmit: handleSubmit };

  return (
    <>
      <style>{CSS}</style>

      {/* ── MOBILE ────────────────────────────────────────────── */}
      <div className="login-mobile" style={{ minHeight: '100dvh', flexDirection: 'column', background: '#0F172A' }}>

        {/* Top */}
        <div style={{ padding: 'max(48px,env(safe-area-inset-top)) 24px 24px', display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeInUp 0.4s ease both' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.3s' }}>
              <Zap size={20} color="white" fill="white" />
            </div>
            <span style={{ fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: '-0.6px' }}>WAY FIT</span>
          </div>

          {/* Headline */}
          <div>
            <h1 style={{ margin: '0 0 6px', fontSize: 30, fontWeight: 900, color: 'white', letterSpacing: '-1px', lineHeight: 1.15 }}>
              Treine com <span style={{ color: accent, transition: 'color 0.3s' }}>inteligência</span>
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.45)', minHeight: 20 }}>{typeText}</p>
          </div>

          {/* Role toggle */}
          <div style={{ display: 'flex', gap: 0, background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: 4 }}>
            {[{ r: 'student', label: 'Aluno', Icon: User }, { r: 'personal', label: 'Personal', Icon: Dumbbell }].map(({ r, label, Icon }) => (
              <button key={r} onClick={() => switchRole(r)}
                className={`role-tab${role === r ? ' active' : ''}`}
                style={{ color: role === r ? '#111827' : 'rgba(255,255,255,0.45)' }}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Form card */}
        <div style={{ background: 'white', borderRadius: '24px 24px 0 0', padding: '24px 24px max(28px,env(safe-area-inset-bottom))', animation: 'fadeInUp 0.4s ease 0.1s both' }}>
          <div style={{ width: 32, height: 4, borderRadius: 2, background: '#E5E7EB', margin: '0 auto 20px' }} />
          <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 800, color: '#111827' }}>Bem-vindo de volta</h2>
          <LoginForm {...formProps} />
          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#9CA3AF' }}>
            Sem conta?{' '}
            <Link to="/registro" style={{ color: accent, fontWeight: 700, textDecoration: 'none', transition: 'color 0.3s' }}>Cadastre-se grátis</Link>
          </p>
        </div>
      </div>

      {/* ── DESKTOP ───────────────────────────────────────────── */}
      <div className="login-desktop" style={{ minHeight: '100vh' }}>

        {/* Left — brand side */}
        <div style={{ flex: '1 1 55%', background: '#F8FAFC', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px 72px', position: 'relative', borderRight: '1px solid #E5E7EB' }}>
          <div style={{ maxWidth: 420, animation: 'fadeInUp 0.5s ease both' }}>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={21} color="white" fill="white" />
              </div>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#111827', letterSpacing: '-0.5px' }}>WAY FIT</span>
            </div>

            <h1 style={{ margin: '0 0 14px', fontSize: 40, fontWeight: 900, color: '#111827', lineHeight: 1.1, letterSpacing: '-1.5px' }}>
              A plataforma do<br />personal profissional
            </h1>

            <p style={{ margin: '0 0 48px', fontSize: 16, color: '#6B7280', lineHeight: 1.65, minHeight: 28 }}>
              {typeText}<span style={{ opacity: 0.4 }}>|</span>
            </p>

            {/* Value props */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {[
                { icon: User,     label: 'Alunos organizados',      sub: 'Histórico, evolução e pagamentos em um lugar' },
                { icon: Dumbbell, label: 'Treinos profissionais',    sub: 'Monte planos completos em minutos com IA' },
                { icon: Zap,      label: 'App do aluno integrado',   sub: 'Seu aluno acessa tudo direto pelo celular' },
              ].map(({ icon: Icon, label, sub }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, animation: `fadeIn 0.5s ease ${0.2 + i * 0.08}s both` }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#10B98118', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color="#10B981" />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827' }}>{label}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 12, color: '#9CA3AF' }}>{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — form side */}
        <div style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px 72px', background: 'white', animation: 'fadeIn 0.5s ease 0.1s both' }}>
          <div style={{ maxWidth: 360, width: '100%', margin: '0 auto' }}>

            {/* Role toggle */}
            <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 10, padding: 4, marginBottom: 28 }}>
              {[{ r: 'student', label: 'Aluno', Icon: User }, { r: 'personal', label: 'Personal', Icon: Dumbbell }].map(({ r, label, Icon }) => (
                <button key={r} onClick={() => switchRole(r)}
                  className={`role-tab${role === r ? ' active' : ''}`}>
                  <Icon size={14} />{label}
                </button>
              ))}
            </div>

            <div key={`dh-${role}`} style={{ marginBottom: 24, animation: 'fadeIn 0.25s ease both' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 900, color: '#111827', letterSpacing: '-0.5px' }}>Bem-vindo de volta</h2>
              <p style={{ margin: 0, fontSize: 14, color: '#9CA3AF' }}>
                {isStudent ? 'Entre para acessar seus treinos' : 'Acesse o painel dos seus alunos'}
              </p>
            </div>

            <LoginForm {...formProps} />

            <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid #F3F4F6', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#9CA3AF' }}>
                Sem conta?{' '}
                <Link to="/registro" style={{ color: accent, fontWeight: 700, textDecoration: 'none', transition: 'color 0.3s' }}>Cadastre-se grátis</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
