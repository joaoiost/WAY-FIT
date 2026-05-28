import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Zap, Star, Users, CheckCircle, Loader, Eye, EyeOff, ChevronRight, ArrowRight } from 'lucide-react';
import { supabase, hasSupabase } from '../lib/supabase';

const GOALS = [
  { value: 'Emagrecer',    emoji: '🔥', label: 'Emagrecer' },
  { value: 'Hipertrofia',  emoji: '💪', label: 'Ganhar massa' },
  { value: 'Condicionamento', emoji: '🏃', label: 'Condicionamento' },
  { value: 'Saúde',        emoji: '🌟', label: 'Qualidade de vida' },
  { value: 'Definição',    emoji: '⚡', label: 'Definição' },
  { value: 'Vingança',     emoji: '😈', label: 'Fazer ela se arrepender' },
];

export default function PublicProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // form
  const [form, setForm] = useState({ name: '', email: '', phone: '', goal: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [stage, setStage] = useState('landing'); // 'landing' | 'register' | 'done'
  const [needsEmailConf, setNeedsEmailConf] = useState(false);

  useEffect(() => {
    if (!hasSupabase || !slug) { setNotFound(true); setLoading(false); return; }
    supabase.from('profiles').select('*').eq('slug', slug).eq('role', 'personal').single()
      .then(({ data }) => {
        if (data) setProfile(data);
        else setNotFound(true);
        setLoading(false);
      });
  }, [slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.goal) { setError('Selecione sua meta'); return; }
    if (form.password.length < 6) { setError('Senha deve ter mínimo 6 caracteres'); return; }
    if (form.password !== form.confirm) { setError('As senhas não coincidem'); return; }
    setSubmitting(true);
    setError('');

    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { name: form.name, role: 'student', phone: form.phone } },
    });

    if (authErr) { setError(authErr.message); setSubmitting(false); return; }

    const userId = authData.user?.id;
    const emailConfRequired = !authData.session;

    if (userId) {
      const initials = form.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
      const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      await supabase.from('students').insert({
        personal_id: profile.id,
        user_id: userId,
        name: form.name,
        email: form.email,
        phone: form.phone,
        goal: form.goal,
        plan: 'Mensal',
        plan_price: null,
        status: 'ativo',
        initials,
        color,
        join_date: new Date().toISOString().slice(0, 10),
      });
    }

    setNeedsEmailConf(emailConfRequired);
    setSubmitting(false);
    setStage('done');
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A' }}>
      <Loader size={28} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0F172A', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'white', margin: '0 0 8px' }}>Perfil não encontrado</h1>
        <p style={{ color: '#94A3B8', margin: '0 0 24px', fontSize: 14 }}>Este link não existe ou foi removido.</p>
        <Link to="/login" style={{ background: '#3B82F6', color: 'white', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>Ir para o app</Link>
      </div>
    </div>
  );

  const initials = profile.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const firstName = profile.name.split(' ')[0];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 60%, #0F172A 100%)' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={15} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>WAY FIT</span>
        </div>
        <Link to="/aluno/login" style={{ fontSize: 13, color: '#94A3B8', textDecoration: 'none' }}>Já tenho conta →</Link>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px 60px', display: 'grid', gridTemplateColumns: stage === 'landing' ? '1fr 1fr' : '1fr', gap: 28, alignItems: 'start' }} className="public-profile-grid">

        {/* LEFT — Personal card (always visible) */}
        <div>
          <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '28px 24px', textAlign: 'center', marginBottom: 16 }}>
            <div style={{ width: 90, height: 90, borderRadius: '50%', margin: '0 auto 14px', overflow: 'hidden', boxShadow: '0 0 0 4px rgba(59,130,246,0.35)', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 28, fontWeight: 800, color: 'white' }}>{initials}</span>
              }
            </div>
            <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: 'white' }}>{profile.name}</h1>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#60A5FA', fontWeight: 600 }}>Personal Trainer</p>

            {profile.bio && (
              <p style={{ margin: '0 0 18px', fontSize: 14, color: '#CBD5E1', lineHeight: 1.7 }}>{profile.bio}</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              {[{ icon: Star, v: '5.0', s: 'Avaliação' }, { icon: Users, v: '50+', s: 'Alunos' }, { icon: CheckCircle, v: '3 anos', s: 'Experiência' }].map(({ icon: Icon, v, s }) => (
                <div key={s} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 16px' }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'white' }}>{v}</p>
                  <p style={{ margin: 0, fontSize: 10, color: '#94A3B8' }}>{s}</p>
                </div>
              ))}
            </div>
          </div>

          {stage === 'landing' && (
            <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 16, padding: '20px 24px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 14px', fontSize: 22, fontWeight: 800, color: 'white', lineHeight: 1.3 }}>
                Transforme seu corpo com {firstName}
              </p>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: '#94A3B8', lineHeight: 1.6 }}>
                Treinos personalizados, acompanhamento em tempo real e resultados reais.
              </p>
              <button
                onClick={() => setStage('register')}
                style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', color: 'white', border: 'none', borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                Quero começar agora <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* RIGHT — Register form */}
        {(stage === 'register' || stage === 'done') && (
          <div style={{ background: 'white', borderRadius: 20, padding: '28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>

            {stage === 'done' ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: needsEmailConf ? '#FEF3C7' : 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <span style={{ fontSize: 34 }}>{needsEmailConf ? '📧' : '🎉'}</span>
                </div>
                <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800 }}>
                  {needsEmailConf ? 'Confirme seu email' : 'Bem-vindo(a)!'}
                </h2>
                <p style={{ margin: '0 0 20px', fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
                  {needsEmailConf
                    ? `Enviamos um link de confirmação para ${form.email}. Clique no link antes de fazer login.`
                    : `Sua conta foi criada! Agora acesse a área do aluno e veja seus treinos com ${firstName}.`
                  }
                </p>
                {!needsEmailConf && (
                  <button
                    onClick={() => navigate('/aluno/login')}
                    style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', color: 'white', border: 'none', borderRadius: 10, padding: '13px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    Acessar minha área <ChevronRight size={18} />
                  </button>
                )}
                {needsEmailConf && (
                  <Link to="/aluno/login" style={{ display: 'block', marginTop: 12, color: '#3B82F6', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                    Ir para login →
                  </Link>
                )}
              </div>
            ) : (
              <>
                <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#111827' }}>Criar minha conta</h2>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6B7280' }}>Aluno de {firstName} · Grátis</p>

                {error && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#DC2626' }}>{error}</div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label>Nome completo *</label>
                      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Seu nome" required />
                    </div>
                    <div>
                      <label>Email *</label>
                      <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="seu@email.com" required />
                    </div>
                    <div>
                      <label>WhatsApp</label>
                      <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" />
                    </div>
                    <div style={{ position: 'relative' }}>
                      <label>Senha *</label>
                      <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mín. 6 caracteres" required style={{ paddingRight: 36 }} />
                      <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 10, bottom: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 0 }}>
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div>
                      <label>Confirmar senha *</label>
                      <input type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} placeholder="••••••••" required />
                    </div>
                  </div>

                  <div>
                    <label style={{ marginBottom: 8 }}>Qual é a sua meta? *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                      {GOALS.map(g => (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => { setForm(f => ({ ...f, goal: g.value })); setError(''); }}
                          style={{
                            padding: '10px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                            border: `2px solid ${form.goal === g.value ? '#3B82F6' : '#E5E7EB'}`,
                            background: form.goal === g.value ? '#EFF6FF' : 'white',
                            transition: 'all 0.12s',
                          }}
                        >
                          <div style={{ fontSize: 18 }}>{g.emoji}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: form.goal === g.value ? '#1D4ED8' : '#374151', marginTop: 3, lineHeight: 1.3 }}>{g.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', color: 'white', border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    {submitting ? 'Criando conta...' : `Começar com ${firstName}`}
                    {!submitting && <ArrowRight size={16} />}
                  </button>

                  <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.6 }}>
                    Ao criar sua conta você concorda com os{' '}
                    <a href="/termos" target="_blank" rel="noreferrer" style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: 600 }}>Termos de Uso</a>
                    {' '}e a{' '}
                    <a href="/privacidade" target="_blank" rel="noreferrer" style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: 600 }}>Política de Privacidade</a>
                  </p>
                </form>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @media (max-width: 700px) {
          .public-profile-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
