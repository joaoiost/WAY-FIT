import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { toast } from '../../lib/toast';

const DURATION = 5000;

export default function ToastContainerV2() {
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
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2 w-[min(380px,calc(100vw-32px))]"
      style={{ top: 'max(16px, env(safe-area-inset-top, 0px))', colorScheme: 'light' }}
    >
      {toasts.map(t => {
        const isError = t.type === 'error';
        return (
          <div
            key={t.id}
            role="alert"
            className={`flex items-start gap-2.5 bg-white rounded-xl px-3.5 py-3 shadow-lg border animate-[toastIn_0.2s_ease] ${
              isError ? 'border-danger-500/30' : 'border-success-500/30'
            }`}
          >
            {isError
              ? <AlertTriangle size={17} className="text-danger-500 shrink-0 mt-0.5" />
              : <CheckCircle2 size={17} className="text-success-500 shrink-0 mt-0.5" />}
            <p className="flex-1 m-0 text-[13px] font-semibold text-ink-900 leading-snug">
              {t.message}
            </p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Fechar aviso"
              className="shrink-0 p-0.5 text-ink-300 hover:text-ink-500"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
      <style>{`@keyframes toastIn { from { transform: translateY(-8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}
