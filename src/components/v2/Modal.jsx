import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Modal/gaveta padrão pro app novo. Substitui as janelas "position:fixed"
// feitas na mão em cada tela (Treinos chegava a empilhar 3 uma sobre a
// outra com z-index escolhido no chute).
//
// variant="dialog" (padrão) — janela central, some sozinha na tela.
// variant="drawer" — painel deslizando da direita, ocupa a tela inteira
// no celular. Usar pra fluxos maiores (ex: montar um treino).
export default function ModalV2({
  isOpen,
  onClose,
  title,
  children,
  footer,
  variant = 'dialog',
  maxWidth = '480px',
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDrawer = variant === 'drawer';

  return (
    <div
      className={`fixed inset-0 z-[1000] flex bg-ink-900/45 ${isDrawer ? 'justify-end' : 'items-center justify-center p-4 sm:items-center'}`}
      style={{ colorScheme: 'light' }}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      role="presentation"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={
          isDrawer
            ? 'w-full sm:max-w-md h-full bg-white flex flex-col outline-none shadow-2xl animate-[slideInRight_0.2s_ease]'
            : 'w-full bg-white rounded-2xl flex flex-col outline-none shadow-2xl max-h-[90vh] animate-[popIn_0.15s_ease]'
        }
        style={isDrawer ? undefined : { maxWidth }}
      >
        {title && (
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-ink-100 shrink-0">
            <h3 className="text-[15px] font-bold text-ink-900 m-0">{title}</h3>
            <button
              onClick={() => onClose?.()}
              aria-label="Fechar"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:bg-ink-50 hover:text-ink-700 shrink-0"
            >
              <X size={17} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-ink-100 shrink-0">
            {footer}
          </div>
        )}
      </div>
      <style>{`
        @keyframes popIn { from { opacity: 0; transform: scale(0.97) translateY(4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}
