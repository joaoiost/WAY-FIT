import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function StudentLogin() {
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
    await new Promise(r => setTimeout(r, 500));
    const result = await login(email, password);
    setLoading(false);
    if (result.success && result.role === 'student') {
      navigate('/aluno/dashboard');
    } else if (result.success && result.role === 'personal') {
      setError('Esse acesso é para personal trainers. Use a área do personal.');
    } else {
      setError(result.error);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #064E3B 0%, #065F46 50%, #047857 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'white',
        borderRadius: 20,
        padding: 40,
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={22} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, background: 'linear-gradient(135deg, #10B981, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            WAY FIT
          </span>
        </div>
        <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 24 }}>
          Área do Aluno
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '0 0 8px', textAlign: 'center' }}>
          Bem-vindo de volta!
        </h2>
        <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 28px', textAlign: 'center' }}>
          Acesse seus treinos e agenda
        </p>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
            <AlertCircle size={16} color="#EF4444" />
            <span style={{ fontSize: 14, color: '#DC2626' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
          </div>
          <div style={{ marginBottom: 24, position: 'relative' }}>
            <label>Senha</label>
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ paddingRight: 40 }}
            />
            <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, bottom: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 0 }}>
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button
            type="submit"
            style={{
              width: '100%',
              padding: 13,
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Acessar meus treinos'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#9CA3AF', marginTop: 20 }}>
          É personal trainer?{' '}
          <Link to="/login" style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>
            Acesse o painel
          </Link>
        </p>
      </div>
    </div>
  );
}
