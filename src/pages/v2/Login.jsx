import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, AlertCircle, Dumbbell, User, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLightScheme } from './useLightScheme';

const ROLES = [
  { key: 'personal', label: 'Personal Trainer', icon: Dumbbell },
  { key: 'student', label: 'Aluno', icon: User },
];

export default function LoginV2() {
  useLightScheme();
  const [role, setRole] = useState('personal');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Guarda o papel esperado enquanto espera o perfil carregar de verdade —
  // navegar antes disso (só com base no retorno do login()) faz a troca de
  // tela acontecer rápido demais e quebra o React (erro de insertBefore).
  const [pendingRole, setPendingRole] = useState(null);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!pendingRole || !user) return;
    if (user.role !== pendingRole) {
      setError(
        user.role === 'student'
          ? 'Esse e-mail é de um aluno. Selecione "Aluno" acima.'
          : 'Esse e-mail é de um personal trainer. Selecione "Personal Trainer" acima.'
      );
      setPendingRole(null);
      setLoading(false);
      return;
    }
    navigate(user.role === 'personal' ? '/dashboard' : '/aluno/dashboard');
  }, [user, pendingRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);

    if (!result.success) {
      setLoading(false);
      setError(result.error || 'E-mail ou senha incorretos.');
      return;
    }
    // Login confirmado no Supabase — agora espera o AuthContext terminar de
    // carregar o perfil (o efeito acima navega quando `user` estiver pronto).
    setPendingRole(role);
  };

  return (
    <div className="v2-scope min-h-screen flex bg-white">
      {/* Painel de marca — só em telas médias+ */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-brand-600 text-white p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Zap size={20} className="fill-white" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight">WAY FIT</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-3xl font-extrabold leading-tight mb-4">
            Gerencie seus alunos com clareza.
          </h1>
          <p className="text-brand-100 text-base leading-relaxed">
            Treinos, agenda, financeiro e nutrição em um só lugar — pra você
            focar no que importa: o resultado do seu aluno.
          </p>
        </div>

        <p className="text-sm text-brand-200">© {new Date().getFullYear()} WAY FIT</p>
      </div>

      {/* Formulário */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10 justify-center">
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center">
              <Zap size={18} className="text-white fill-white" />
            </div>
            <span className="text-xl font-extrabold text-ink-900 tracking-tight">WAY FIT</span>
          </div>

          <h2 className="text-2xl font-bold text-ink-900 mb-1">Entrar</h2>
          <p className="text-ink-500 text-sm mb-6">Acesse sua conta pra continuar.</p>

          {/* Seletor de papel */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-ink-100 rounded-xl mb-6">
            {ROLES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setRole(key); setError(''); }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  role === key
                    ? 'bg-white text-ink-900 shadow-sm'
                    : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-danger-50 border border-danger-500/20 rounded-lg px-3 py-2.5 mb-4">
              <AlertCircle size={15} className="text-danger-500 shrink-0 mt-0.5" />
              <span className="text-sm text-danger-500">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink-700 mb-1.5">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-ink-200 text-ink-900 text-sm outline-none transition-shadow focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-ink-700">
                  Senha
                </label>
                <Link to="/esqueci-senha" className="text-xs text-ink-500 hover:text-brand-600">
                  Esqueceu?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-ink-200 text-ink-900 text-sm outline-none transition-shadow focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-500"
                  aria-label={showPass ? 'Esconder senha' : 'Mostrar senha'}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-sm text-ink-500 mt-6">
            Sem conta?{' '}
            <Link to="/v2/registro" className="text-brand-600 font-semibold hover:text-brand-700">
              Cadastre-se grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
