import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Zap, Eye, EyeOff, CheckCircle, AlertCircle, Loader, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, hasSupabase } from '../lib/supabase';

const GOALS = [
  { value: 'Emagrecer', emoji: '🔥', label: 'Emagrecer', desc: 'Perder peso e reduzir gordura' },
  { value: 'Hipertrofia', emoji: '💪', label: 'Ganhar massa muscular', desc: 'Aumentar força e volume' },
  { value: 'Condicionamento', emoji: '🏃', label: 'Condicionamento físico', desc: 'Mais energia e resistência' },
  { value: 'Definição', emoji: '⚡', label: 'Definição corporal', desc: 'Tonificar e secar' },
  { value: 'Saúde', emoji: '🌟', label: 'Qualidade de vida', desc: 'Saúde e bem-estar' },
  { value: 'Vingança', emoji: '😈', label: 'Fazer ela se arrepender', desc: 'A motivação mais poderosa do mundo' },
];

export default function InviteAccept() {
  const [params] = useSearchParams();
  const token = params.get('invite');
  const { validateInvite, register } = useAuth();
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  // stage: 'form' | 'onboarding' | 'emailconf' | 'done'
  const [stage, setStage] = useState('form');
  const [userId, setUserId] = useState(null);

  const [form, setForm] = useState({ name: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [onboarding, setOnboarding] = useState({ weight: '', height: '', goal: '' });
  const [savingOnboarding, setSavingOnboarding] = useState(false);

  useEffect(() => {
    if (!token) { setInvalid(true); setLoading(false); return; }
    validateInvite(token).then(inv => {
      if (inv) { setInvite(inv); setForm(f => ({ ...f, name: inv.student_name || inv.studentName || '' })); }
      else setInvalid(true);
      setLoading(false);
    });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('As senhas não coincidem'); return; }
    if (form.password.length < 6) { setError('Mínimo 6 caracteres'); return; }
    setSubmitting(true);
    setError('');
    const result = await register({ name: form.name, email: invite.email, password: form.password, role: 'student', inviteToken: token });
    setSubmitting(false);
    if (result.success) {
      setUserId(result.userId);
      if (result.needsEmailConfirmation) {
        setStage('emailconf');
      } else {
        setStage('onboarding');
      }
    } else {
      setError(result.error);
    }
  };

  const handleOnboarding = async (e) => {
    e.preventDefault();
    if (!onboarding.goal) { setError('Selecione sua meta'); return; }
    setSavingOnboarding(true);
    if (hasSupabase && userId) {
      await supabase.from('students')
        .update({
          goal: onboarding.goal,
          weight: onboarding.weight ? parseFloat(onboarding.weight) : null,
          height: onboarding.height ? parseInt(onboarding.height) : null,
        })
        .eq('user_id', userId);
    }
    setSavingOnboarding(false);
    setStage('done');
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A, #1E1B4B)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader size={32} color="#60A5FA" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: stage === 'onboarding' ? 520 : 440, background: 'white', borderRadius: 20, padding: 40, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={22} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>WAY FIT</span>
        </div>

        {/* Convite inválido */}
        {invalid && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <AlertCircle size={32} color="#EF4444" />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800 }}>Convite inválido</h2>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6B7280' }}>Este link de convite é inválido ou já foi utilizado.</p>
            <Link to="/login" className="btn-primary" style={{ display: 'flex', justifyContent: 'center', textDecoration: 'none' }}>Ir para login</Link>
          </div>
        )}

        {/* Etapa 1: Criar conta */}
        {!invalid && stage === 'form' && invite && (
          <>
            <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, border: '1px solid #DBEAFE' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>Você foi convidado por</p>
              <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, color: '#111827' }}>
                {invite.personal_name || 'Seu Personal Trainer'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#3B82F6' }}>para acessar sua área exclusiva 🎉</p>
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>Criar sua conta</h2>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px' }}>Email: <strong>{invite.email}</strong></p>

            {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#DC2626' }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label>Seu nome *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome completo" required />
              </div>
              <div style={{ position: 'relative' }}>
                <label>Senha *</label>
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" required style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, bottom: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 0 }}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div>
                <label>Confirmar senha *</label>
                <input type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} placeholder="••••••••" required />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 13, fontSize: 15, opacity: submitting ? 0.7 : 1 }} disabled={submitting}>
                {submitting ? 'Criando conta...' : 'Continuar'}
                {!submitting && <ChevronRight size={18} />}
              </button>
            </form>
          </>
        )}

        {/* Etapa 2: Onboarding */}
        {stage === 'onboarding' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle size={16} color="white" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#10B981' }}>Conta criada!</span>
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>Vamos te conhecer melhor</h2>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 24px' }}>Seu personal vai usar isso para personalizar seus treinos.</p>

            {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#DC2626' }}>{error}</div>}

            <form onSubmit={handleOnboarding}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label>Peso atual (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="300"
                    value={onboarding.weight}
                    onChange={e => setOnboarding(o => ({ ...o, weight: e.target.value }))}
                    placeholder="ex: 78.5"
                  />
                </div>
                <div>
                  <label>Altura (cm)</label>
                  <input
                    type="number"
                    min="100"
                    max="250"
                    value={onboarding.height}
                    onChange={e => setOnboarding(o => ({ ...o, height: e.target.value }))}
                    placeholder="ex: 175"
                  />
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 10 }}>Qual é a sua meta? *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {GOALS.map(g => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => { setOnboarding(o => ({ ...o, goal: g.value })); setError(''); }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: `2px solid ${onboarding.goal === g.value ? (g.value === 'Vingança' ? '#7C3AED' : '#3B82F6') : '#E5E7EB'}`,
                        background: onboarding.goal === g.value ? (g.value === 'Vingança' ? '#F5F3FF' : '#EFF6FF') : 'white',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{g.emoji}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: onboarding.goal === g.value ? (g.value === 'Vingança' ? '#5B21B6' : '#1D4ED8') : '#111827', lineHeight: 1.3 }}>{g.label}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, lineHeight: 1.3 }}>{g.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 13, fontSize: 15, opacity: savingOnboarding ? 0.7 : 1 }} disabled={savingOnboarding}>
                {savingOnboarding ? 'Salvando...' : 'Acessar minha área'}
                {!savingOnboarding && <ChevronRight size={18} />}
              </button>

              <button type="button" onClick={() => setStage('done')} style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', color: '#9CA3AF', fontSize: 12, cursor: 'pointer', padding: 8 }}>
                Pular por agora
              </button>
            </form>
          </>
        )}

        {/* Etapa 3: Confirmação de email necessária */}
        {stage === 'emailconf' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <span style={{ fontSize: 32 }}>📧</span>
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800 }}>Verifique seu email</h2>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: '#6B7280' }}>
              Sua conta foi criada! Enviamos um email de confirmação para <strong>{invite?.email}</strong>.
            </p>
            <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', marginBottom: 24, fontSize: 13, color: '#92400E', textAlign: 'left' }}>
              Verifique sua caixa de entrada (e o spam) e clique no link para ativar sua conta antes de fazer login.
            </div>
            <Link to="/aluno/login" className="btn-primary" style={{ display: 'flex', justifyContent: 'center', textDecoration: 'none' }}>
              Ir para login
            </Link>
          </div>
        )}

        {/* Etapa 4: Tudo pronto */}
        {stage === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <span style={{ fontSize: 36 }}>🎉</span>
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800 }}>Tudo pronto!</h2>
            <p style={{ margin: '0 0 8px', fontSize: 14, color: '#6B7280' }}>
              Sua conta foi configurada com sucesso.
            </p>
            {onboarding.goal === 'Vingança' && (
              <div style={{ background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', border: '1px solid #DDD6FE', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#5B21B6', fontWeight: 600 }}>
                😈 Vai arrasar! Ela já vai estar se arrependendo.
              </div>
            )}
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 13, fontSize: 15 }} onClick={() => navigate('/aluno/login')}>
              Acessar minha área
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
