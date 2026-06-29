import { useEffect } from 'react';
import { X, Droplets } from 'lucide-react';
import { useNotifications } from '../../context/NotificationsContext';

export default function WaterToast() {
  const { waterToast, dismissWater } = useNotifications();

  useEffect(() => {
    if (!waterToast) return;
    const t = setTimeout(dismissWater, 8000);
    return () => clearTimeout(t);
  }, [waterToast]);

  if (!waterToast) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: 'white', borderRadius: 16, padding: '16px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', gap: 14,
      maxWidth: 320, border: '2px solid #DBEAFE', animation: 'slideUp 0.3s ease',
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #60A5FA, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Droplets size={22} color="white" />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Hora de beber água</p>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6B7280', lineHeight: 1.4 }}>
          Mantenha-se hidratado. Beba pelo menos um copo agora!
        </p>
      </div>
      <button onClick={dismissWater} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', flexShrink: 0 }}>
        <X size={18} />
      </button>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
