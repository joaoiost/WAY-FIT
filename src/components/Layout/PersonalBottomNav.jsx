import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Dumbbell, Salad, MessageCircle } from 'lucide-react';
import { useNotifications } from '../../context/NotificationsContext';

const TABS = [
  { to: '/dashboard',          icon: LayoutDashboard, label: 'Início',   end: true },
  { to: '/dashboard/alunos',   icon: Users,           label: 'Alunos'   },
  { to: '/dashboard/treinos',  icon: Dumbbell,        label: 'Treinos'  },
  { to: '/dashboard/nutricao', icon: Salad,           label: 'Nutrição' },
  { to: '/dashboard/chat',     icon: MessageCircle,   label: 'Chat',     notif: true },
];

export default function PersonalBottomNav() {
  const { unreadMessages } = useNotifications?.() || {};

  return (
    <nav className="personal-bottom-nav">
      {TABS.map(({ to, icon: Icon, label, end, notif }) => (
        <NavLink key={to} to={to} end={end} className="bottom-nav-tab">
          {({ isActive }) => (
            <>
              <div className="bottom-nav-pill" style={{ position: 'relative', background: isActive ? 'var(--accent)' : 'transparent' }}>
                <Icon size={18} color={isActive ? 'white' : 'var(--gray-400)'} strokeWidth={isActive ? 2.5 : 1.8} />
                {notif && unreadMessages > 0 && (
                  <span style={{
                    position: 'absolute', top: -2, right: -2,
                    background: 'var(--red)', color: 'white',
                    fontSize: 9, fontWeight: 800,
                    minWidth: 14, height: 14, borderRadius: 99,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                    border: '1.5px solid var(--bg-surface)',
                  }}>
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </div>
              <span className="bottom-nav-label" style={{ color: isActive ? 'var(--accent)' : 'var(--gray-400)', fontWeight: isActive ? 700 : 500 }}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
