import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('As senhas não coincidem'); return; }
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres'); return; }
    setLoading(true);
    const result = await resetPassword(password);
    setLoading(false);
    if (result.success) setDone(true);
    else setError(result.error);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 20, padding: 40, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={22} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>WAY FIT</span>
        </div>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={32} color="#10B981" />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800 }}>Senha alterada!</h2>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6B7280' }}>Sua senha foi alterada com sucesso.</p>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 13, fontSize: 15 }} onClick={() => navigate('/login')}>
              Ir para o login
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '0 0 8px', textAlign: 'center' }}>Nova senha</h2>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 28px', textAlign: 'center' }}>Digite e confirme sua nova senha</p>

            {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#DC2626' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              {[['Nova senha', password, setPassword], ['Confirmar senha', confirm, setConfirm]].map(([lbl, val, setter], i) => (
                <div key={i} style={{ marginBottom: 16, position: 'relative' }}>
                  <label>{lbl}</label>
                  <input type={showPass ? 'text' : 'password'} value={val} onChange={e => setter(e.target.value)} placeholder="••••••••" required style={{ paddingRight: i === 0 ? 40 : undefined }} />
                  {i === 0 && (
                    <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, bottom: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 0 }}>
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  )}
                </div>
              ))}
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 13, fontSize: 15, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                {loading ? 'Salvando...' : 'Alterar senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
