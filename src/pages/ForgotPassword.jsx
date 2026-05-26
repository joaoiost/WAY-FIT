import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const { forgotPassword, hasSupabase } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await forgotPassword(email);
    setLoading(false);
    if (result.success) setSent(true);
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

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={32} color="#10B981" />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#111827' }}>Email enviado!</h2>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
              {hasSupabase
                ? `Enviamos um link de recuperação para ${email}. Verifique sua caixa de entrada.`
                : `Modo demo: link de recuperação não é enviado por email. Com Supabase configurado, o email seria enviado para ${email}.`}
            </p>
            <Link to="/login" className="btn-primary" style={{ display: 'flex', justifyContent: 'center', textDecoration: 'none' }}>
              Voltar ao login
            </Link>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '0 0 8px', textAlign: 'center' }}>Esqueceu a senha?</h2>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 28px', textAlign: 'center' }}>
              Digite seu email e enviaremos um link para recuperar sua senha
            </p>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#DC2626' }}>
                {error}
              </div>
            )}

            {!hasSupabase && (
              <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400E' }}>
                ⚠️ Modo demo: configure o Supabase para envio real de emails
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label>Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required style={{ paddingLeft: 36 }} />
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>

            <Link to="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, color: '#6B7280', fontSize: 14, textDecoration: 'none' }}>
              <ArrowLeft size={15} /> Voltar ao login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
