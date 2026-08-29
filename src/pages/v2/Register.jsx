import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, AlertCircle, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLightScheme } from './useLightScheme';

export default function RegisterV2() {
  useLightScheme();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('As senhas não coincidem.'); return; }
    if (form.password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    setLoading(true);
    const result = await register({ name: form.name, email: form.email, password: form.password, role: 'personal', phone: form.phone });
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Erro ao criar conta. Tente novamente.');
      return;
    }
    if (result.needsEmailConfirmation) {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } else {
      navigate('/onboarding');
    }
  };

  if (success) {
    return (
      <div className="v2-scope min-h-screen flex items-center justify-center bg-ink-50 p-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-5">
            <Check size={26} className="text-success-500" strokeWidth={3} />
          </div>
          <h2 className="text-xl font-bold text-ink-900 mb-2">Conta criada!</h2>
          <p className="text-sm text-ink-500 leading-relaxed">
            Verifique seu e-mail pra confirmar o cadastro, depois faça login.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="v2-scope min-h-screen flex bg-white">
      {/* Painel de marca */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-brand-600 text-white p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Zap size={20} className="fill-white" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight">WAY FIT</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-3xl font-extrabold leading-tight mb-4">
            Comece a organizar seus alunos hoje.
          </h1>
          <p className="text-brand-100 text-base leading-relaxed">
            Cadastro grátis, sem cartão. Convide seu primeiro aluno em poucos minutos.
          </p>
        </div>

        <p className="text-sm text-brand-200">© {new Date().getFullYear()} WAY FIT</p>
      </div>

      {/* Formulário */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center">
              <Zap size={18} className="text-white fill-white" />
            </div>
            <span className="text-xl font-extrabold text-ink-900 tracking-tight">WAY FIT</span>
          </div>

          <h2 className="text-2xl font-bold text-ink-900 mb-1">Crie sua conta</h2>
          <p className="text-ink-500 text-sm mb-6">Gerencie seus alunos com facilidade.</p>

          {error && (
            <div className="flex items-start gap-2 bg-danger-50 border border-danger-500/20 rounded-lg px-3 py-2.5 mb-4">
              <AlertCircle size={15} className="text-danger-500 shrink-0 mt-0.5" />
              <span className="text-sm text-danger-500">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-ink-700 mb-1.5">Nome completo</label>
              <input
                id="name" name="name" required autoFocus
                value={form.name} onChange={handleChange}
                placeholder="João Silva"
                className="w-full px-3.5 py-2.5 rounded-lg border border-ink-200 text-ink-900 text-sm outline-none transition-shadow focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink-700 mb-1.5">E-mail profissional</label>
              <input
                id="email" name="email" type="email" required
                value={form.email} onChange={handleChange}
                placeholder="joao@email.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-ink-200 text-ink-900 text-sm outline-none transition-shadow focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-ink-700 mb-1.5">WhatsApp</label>
              <input
                id="phone" name="phone"
                value={form.phone} onChange={handleChange}
                placeholder="(11) 99999-9999"
                className="w-full px-3.5 py-2.5 rounded-lg border border-ink-200 text-ink-900 text-sm outline-none transition-shadow focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink-700 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  id="password" name="password" type={showPass ? 'text' : 'password'} required minLength={6}
                  value={form.password} onChange={handleChange}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-ink-200 text-ink-900 text-sm outline-none transition-shadow focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                />
                <button
                  type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-500"
                  aria-label={showPass ? 'Esconder senha' : 'Mostrar senha'}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-ink-700 mb-1.5">Confirmar senha</label>
              <input
                id="confirm" name="confirm" type="password" required
                value={form.confirm} onChange={handleChange}
                placeholder="Repita a senha"
                className="w-full px-3.5 py-2.5 rounded-lg border border-ink-200 text-ink-900 text-sm outline-none transition-shadow focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="mt-1 w-full py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>

            <p className="text-center text-xs text-ink-400 leading-relaxed">
              Ao criar sua conta, você concorda com nossos{' '}
              <Link to="/termos" className="text-brand-600 font-medium">Termos de Uso</Link> e{' '}
              <Link to="/privacidade" className="text-brand-600 font-medium">Política de Privacidade</Link>.
            </p>
          </form>

          <p className="text-center text-sm text-ink-500 mt-6">
            Já tem conta?{' '}
            <Link to="/v2/login" className="text-brand-600 font-semibold hover:text-brand-700">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
