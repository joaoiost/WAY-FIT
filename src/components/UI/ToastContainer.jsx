import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { toast } from '../../lib/toast';

const DURATION = 5000;

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return toast.subscribe((t) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => {
        setToasts(prev => prev.filter(x => x.id !== t.id));
      }, DURATION);
    });
  }, []);

  const dismiss = (id) => setToasts(prev => prev.filter(x => x.id !== id));

  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed', top: 'max(16px, env(safe-area-inset-top, 0px))', left: '50%', transform: 'translateX(-50%)',
      zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 8,
      width: 'min(360px, calc(100vw - 32px))',
    }}>
      {toasts.map(t => {
        const isError = t.type === 'error';
        return (
          <div key={t.id} role="alert" style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: 'var(--bg-surface)', border: `1.5px solid ${isError ? 'var(--red)' : 'var(--green)'}`,
            borderRadius: 12, padding: '12px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            animation: 'toastIn 0.2s ease',
          }}>
            {isError
              ? <AlertTriangle size={18} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
              : <CheckCircle2 size={18} color="var(--green)" style={{ flexShrink: 0, marginTop: 1 }} />}
            <p style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--gray-900)', lineHeight: 1.4 }}>
              {t.message}
            </p>
            <button onClick={() => dismiss(t.id)} aria-label="Fechar aviso" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', display: 'flex', flexShrink: 0, padding: 2 }}>
              <X size={15} />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes toastIn {
          from { transform: translateY(-8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
