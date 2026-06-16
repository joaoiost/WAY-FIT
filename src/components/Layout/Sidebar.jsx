import { NavLink, useNavigate, Link } from 'react-router-dom';
import { Zap, LayoutDashboard, Users, Calendar, Dumbbell, DollarSign, Bell, LogOut, X, Settings, ClipboardList, MessageCircle, Salad, Apple } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { useNotifications } from '../../context/NotificationsContext';

const PRIMARY = [
  { to: '/dashboard',         icon: LayoutDashboard, label: 'Início',    end: true },
  { to: '/dashboard/alunos',  icon: Users,           label: 'Alunos'    },
  { to: '/dashboard/treinos', icon: Dumbbell,        label: 'Treinos'   },
  { to: '/dashboard/agenda',  icon: Calendar,        label: 'Agenda'    },
];

const SECONDARY = [
  { to: '/dashboard/financeiro', icon: DollarSign,    label: 'Financeiro'   },
  { to: '/dashboard/chat',       icon: MessageCircle, label: 'Chat',  notif: true },
  { to: '/dashboard/frequencia', icon: ClipboardList, label: 'Frequência'   },
  { to: '/dashboard/whatsapp',   icon: Bell,          label: 'Notificações' },
  { to: '/dashboard/perfil',     icon: Settings,      label: 'Meu Perfil'   },
];

const NUTRITION = [
  { to: '/dashboard/nutricao',           icon: Salad, label: 'Planos Alimentares' },
  { to: '/dashboard/nutricao/alimentos', icon: Apple, label: 'Banco de Alimentos' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { open, setOpen } = useSidebar();
  const { unreadCount } = useNotifications?.() || {};

  const close = () => setOpen(false);
  const handleLogout = () => { logout(); navigate('/login'); };
  const initials = user?.avatar || user?.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'WF';

  const NavItem = ({ to, icon: Icon, label, end, notif }) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
      onClick={close}
    >
      <Icon size={17} />
      <span style={{ flex: 1 }}>{label}</span>
      {notif && unreadCount > 0 && (
        <span style={{
          background: 'var(--red)', color: 'white',
          fontSize: 10, fontWeight: 800,
          minWidth: 17, height: 17, borderRadius: 99,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
        }}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </NavLink>
  );

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={close} />}

      <aside className={`app-sidebar${open ? ' sidebar-open' : ''}`}>

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Zap size={18} color="white" fill="white" />
          </div>
          <span className="sidebar-logo-name">WAY FIT</span>
          <button className="sidebar-close-btn" onClick={close} aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {PRIMARY.map(item => <NavItem key={item.to} {...item} />)}

          <div className="sidebar-divider" />
          <p className="sidebar-section-label">Ferramentas</p>

          {SECONDARY.map(item => <NavItem key={item.to} {...item} />)}

          <div className="sidebar-divider" />
          <p className="sidebar-section-label">Nutrição</p>

          {NUTRITION.map(item => <NavItem key={item.to} {...item} />)}
        </nav>

        {/* User card */}
        <Link to="/dashboard/perfil" className="sidebar-user" onClick={close}>
          <div className="sidebar-user-avatar">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="avatar" />
              : <span>{initials}</span>
            }
          </div>
          <div className="sidebar-user-info">
            <p className="sidebar-user-name">{user?.name || 'Personal'}</p>
            <p className="sidebar-user-email">{user?.email || ''}</p>
          </div>
        </Link>

        {/* Logout */}
        <div className="sidebar-footer">
          <button className="sidebar-item" onClick={handleLogout} style={{ color: 'var(--red)', width: '100%' }}>
            <LogOut size={17} />
            Sair
          </button>
        </div>

      </aside>
    </>
  );
}
