import { useState, useEffect, useRef } from 'react';
import { Bell, Menu, CheckCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { useNotifications } from '../../context/NotificationsContext';
import { useLocation } from 'react-router-dom';

const TYPE_COLORS = {
  payment: '#EF4444', absence: '#F59E0B', appointment: '#3B82F6',
  student: '#10B981', workout: '#8B5CF6', water: '#60A5FA',
  achievement: '#F59E0B', message: '#10B981', progress: '#8B5CF6',
};

const PAGE_NAMES = {
  '/dashboard':            'Dashboard',
  '/dashboard/alunos':     'Alunos',
  '/dashboard/agenda':     'Agenda',
  '/dashboard/treinos':    'Treinos',
  '/dashboard/financeiro': 'Financeiro',
  '/dashboard/whatsapp':   'WhatsApp',
  '/dashboard/perfil':     'Meu Perfil',
  '/dashboard/frequencia': 'Frequência',
  '/aluno/dashboard':      'Início',
  '/aluno/treinos':        'Meus Treinos',
  '/aluno/agenda':         'Agenda',
  '/aluno/progresso':      'Progresso',
  '/aluno/historico':      'Histórico',
  '/aluno/chat':           'Chat',
  '/aluno/fotos':          'Fotos & Progresso',
  '/aluno/saude':          'Saúde',
};

export default function Header() {
  const { user } = useAuth();
  const { setOpen } = useSidebar();
  const { notifications, unread, markRead, markAllRead } = useNotifications();
  const { pathname } = useLocation();
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef(null);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = user?.name?.split(' ')[0] || 'Usuário';
  const pageName = PAGE_NAMES[pathname] || '';

  useEffect(() => {
    if (!showPanel) return;
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setShowPanel(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPanel]);

  return (
    <header style={{ background: 'white', borderBottom: '1px solid #F1F5F9', padding: '0 20px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <button className="hamburger-btn" onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: '#374151', flexShrink: 0, display: 'none' }}>
          <Menu size={22} />
        </button>

        {/* Desktop: greeting. Mobile: page name */}
        <div style={{ minWidth: 0 }}>
          <h1 className="header-greeting" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
            {greeting}, {firstName}! 👋
          </h1>
          <h1 className="header-pagename" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827', display: 'none' }}>
            {pageName}
          </h1>
          <p className="header-date" style={{ margin: 0, fontSize: 12, color: '#6B7280', textTransform: 'capitalize' }}>
            {now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* Bell */}
        <div ref={panelRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowPanel(p => !p)}
            style={{ position: 'relative', background: showPanel ? '#F3F4F6' : 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex', transition: 'background 0.15s' }}
          >
            <Bell size={20} color="#6B7280" />
            {unread > 0 && (
              <span style={{ position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: '50%', background: '#EF4444', color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {showPanel && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 360, background: 'white', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid #F1F5F9', zIndex: 200, overflow: 'hidden' }} className="notif-panel-mobile">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #F3F4F6' }}>
                <div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Notificações</span>
                  {unread > 0 && <span style={{ marginLeft: 8, background: '#EF4444', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>{unread}</span>}
                </div>
                {unread > 0 && (
                  <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', fontSize: 12, fontWeight: 600 }}>
                    <CheckCheck size={14} /> Marcar todas
                  </button>
                )}
              </div>

              <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
                    <Bell size={32} color="#E5E7EB" style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                    Nenhuma notificação
                  </div>
                ) : notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    style={{ display: 'flex', gap: 12, padding: '12px 16px', cursor: 'pointer', background: n.read ? 'white' : '#F8FAFF', borderBottom: '1px solid #F9FAFB', transition: 'background 0.15s' }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${TYPE_COLORS[n.type] || '#6B7280'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      {n.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: '#111827' }}>{n.title}</span>
                        <span style={{ fontSize: 10, color: '#9CA3AF', flexShrink: 0 }}>{n.time}</span>
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6B7280', lineHeight: 1.4 }}>{n.message}</p>
                    </div>
                    {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3B82F6', flexShrink: 0, marginTop: 4 }} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <a href="/dashboard/perfil" style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0, textDecoration: 'none', boxShadow: '0 2px 8px rgba(59,130,246,0.25)' }}>
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span>{user?.avatar || 'WF'}</span>
          }
        </a>
      </div>
    </header>
  );
}
