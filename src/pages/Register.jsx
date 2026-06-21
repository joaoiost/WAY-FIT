import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('As senhas não coincidem'); return; }
    if (form.password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres'); return; }
    setLoading(true);
    const result = await register({ name: form.name, email: form.email, password: form.password, role: 'personal', phone: form.phone });
    setLoading(false);
    if (result.success) {
      if (result.needsEmailConfirmation) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 2500);
      } else {
        navigate('/onboarding');
      }
    } else {
      setError(result.error || 'Erro ao criar conta. Tente novamente.');
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'white', borderRadius: 20, padding: 48, textAlign: 'center', maxWidth: 420, width: '100%' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Check size={36} color="white" strokeWidth={3} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '0 0 12px' }}>Conta criada!</h2>
          <p style={{ color: '#6B7280', margin: 0, fontSize: 14, lineHeight: 1.6 }}>
            Verifique seu email para confirmar o cadastro, depois faça login.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440, background: 'white', borderRadius: 20, padding: 40, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={22} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            WAY FIT
          </span>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '0 0 6px', textAlign: 'center' }}>Crie sua conta</h2>
        <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 24px', textAlign: 'center' }}>Gerencie seus alunos com facilidade</p>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
            <AlertCircle size={16} color="#EF4444" />
            <span style={{ fontSize: 13, color: '#DC2626' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label>Nome completo</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="João Silva" required />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label>Email profissional</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="joao@email.com" required />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label>WhatsApp</label>
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="(11) 99999-9999" />
          </div>
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <label>Senha</label>
            <input name="password" type={showPass ? 'text' : 'password'} value={form.password} onChange={handleChange} placeholder="Mínimo 6 caracteres" required minLength={6} style={{ paddingRight: 40 }} />
            <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, bottom: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 0 }}>
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label>Confirmar senha</label>
            <input name="confirm" type="password" value={form.confirm} onChange={handleChange} placeholder="Repita a senha" required />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 13, fontSize: 15, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', margin: '14px 0 0', lineHeight: 1.5 }}>
            Ao criar sua conta, você concorda com nossos{' '}
            <a href="#" style={{ color: '#3B82F6' }}>Termos de Uso</a> e{' '}
            <a href="#" style={{ color: '#3B82F6' }}>Política de Privacidade</a>
          </p>
        </form>

        <p style={{ textAlign: 'center', fontSize: 14, color: '#6B7280', marginTop: 20 }}>
          Já tem conta?{' '}
          <Link to="/login" style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>Entrar</Link>
        </p>
      </div>
    </div>
  );
}
