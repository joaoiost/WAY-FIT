import { NavLink, useNavigate, Link } from 'react-router-dom';
import { Zap, LayoutDashboard, Users, Calendar, Dumbbell, DollarSign, Bell, LogOut, X, Settings, ClipboardList, MessageCircle, Activity, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { useNotifications } from '../../context/NotificationsContext';

const PRIMARY = [
  { to: '/dashboard',             icon: LayoutDashboard, label: 'Início',    end: true },
  { to: '/dashboard/alunos',      icon: Users,           label: 'Alunos'    },
  { to: '/dashboard/cartilhas',   icon: BookOpen,        label: 'Cartilhas' },
  { to: '/dashboard/treinos',     icon: Dumbbell,        label: 'Treinos'   },
  { to: '/dashboard/agenda',      icon: Calendar,        label: 'Agenda'    },
];

const SECONDARY = [
  { to: '/dashboard/financeiro', icon: DollarSign,    label: 'Financeiro'   },
  { to: '/dashboard/chat',       icon: MessageCircle, label: 'Chat',  notif: true },
  { to: '/dashboard/frequencia', icon: ClipboardList, label: 'Frequência'   },
  { to: '/dashboard/whatsapp',   icon: Bell,          label: 'Notificações' },
  { to: '/dashboard/perfil',     icon: Settings,      label: 'Meu Perfil'   },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { open, setOpen } = useSidebar();
  const { unreadCount } = useNotifications?.() || {};

  const handleLogout = () => { logout(); navigate('/login'); };
  const close = () => setOpen(false);
  const initials = user?.avatar || user?.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'WF';

  const NavItem = ({ to, icon: Icon, label, end, notif }) => (
    <NavLink to={to} end={end}
      className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
      onClick={close}
      style={{ position: 'relative' }}>
      <Icon size={18} />
      {label}
      {notif && unreadCount > 0 && (
        <span style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          background: '#EF4444', color: 'white', fontSize: 10, fontWeight: 800,
          minWidth: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
        }}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </NavLink>
  );

  return (
    <>
      {open && <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99 }} className="sidebar-overlay" />}

      <aside className={`app-sidebar${open ? ' sidebar-open' : ''}`}
        style={{ width: 240, minHeight: '100vh', background: 'white', borderRight: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', padding: '20px 16px', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, paddingLeft: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59,130,246,0.35)' }}>
            <Zap size={20} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 900, flex: 1, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.3px' }}>WAY FIT</span>
          <button onClick={close} className="sidebar-close-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6B7280' }}>
            <X size={20} />
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {PRIMARY.map(item => <NavItem key={item.to} {...item} />)}

          <div style={{ margin: '12px 0 8px', borderTop: '1px solid #F3F4F6' }} />
          <p style={{ fontSize: 10, fontWeight: 800, color: '#C4C9D4', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 10px', marginBottom: 4 }}>
            Ferramentas
          </p>

          {SECONDARY.map(item => <NavItem key={item.to} {...item} />)}
        </nav>

        {/* User card */}
        <Link to="/dashboard/perfil" onClick={close}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: '1px solid #F1F5F9', background: 'linear-gradient(135deg, #F9FAFB, #F3F4F6)', textDecoration: 'none', marginBottom: 8, marginTop: 12, transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, #EFF6FF, #F5F3FF)'}
          onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, #F9FAFB, #F3F4F6)'}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }}>
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>{initials}</span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Personal'}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || ''}</p>
          </div>
        </Link>

        <button onClick={handleLogout} className="sidebar-item"
          style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', color: '#EF4444' }}>
          <LogOut size={18} />Sair
        </button>
      </aside>
    </>
  );
}
