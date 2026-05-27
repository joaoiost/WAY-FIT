import { NavLink, useNavigate, Link } from 'react-router-dom';
import { Zap, LayoutDashboard, Users, Calendar, Dumbbell, DollarSign, Bell, LogOut, X, Settings, ClipboardList, MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dashboard/alunos', icon: Users, label: 'Alunos' },
  { to: '/dashboard/agenda', icon: Calendar, label: 'Agenda' },
  { to: '/dashboard/treinos', icon: Dumbbell, label: 'Treinos' },
  { to: '/dashboard/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/dashboard/frequencia', icon: ClipboardList, label: 'Frequência' },
  { to: '/dashboard/financeiro', icon: DollarSign, label: 'Financeiro' },
  { to: '/dashboard/whatsapp', icon: Bell, label: 'Notificações' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { open, setOpen } = useSidebar();

  const handleLogout = () => { logout(); navigate('/login'); };
  const close = () => setOpen(false);
  const initials = user?.avatar || user?.name?.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || 'WF';

  return (
    <>
      {open && (
        <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99 }} className="sidebar-overlay" />
      )}

      <aside className={`app-sidebar${open ? ' sidebar-open' : ''}`} style={{ width: 240, minHeight: '100vh', background: 'white', borderRight: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', padding: '20px 16px', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, paddingLeft: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, flex: 1, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>WAY FIT</span>
          <button onClick={close} className="sidebar-close-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6B7280' }}>
            <X size={20} />
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', marginBottom: 6 }}>Principal</p>
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`} onClick={close}>
              <Icon size={18} />{label}
            </NavLink>
          ))}
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '16px 8px 6px' }}>Conta</p>
          <NavLink to="/dashboard/perfil" className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`} onClick={close}>
            <Settings size={18} />Meu Perfil
          </NavLink>
        </nav>

        <Link
          to="/dashboard/perfil" onClick={close}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: 10, border: '1px solid #F1F5F9', background: '#F9FAFB', textDecoration: 'none', marginBottom: 8 }}
        >
          <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{initials}</span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Personal'}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || ''}</p>
          </div>
        </Link>

        <button onClick={handleLogout} className="sidebar-item" style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', color: '#EF4444' }}>
          <LogOut size={18} />Sair
        </button>
      </aside>
    </>
  );
}
