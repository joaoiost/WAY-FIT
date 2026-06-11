import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, BookOpen, MoreHorizontal, ClipboardList, DollarSign, Bell, Settings, MessageCircle, LogOut, Dumbbell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const TABS = [
  { to: '/dashboard',            icon: LayoutDashboard, label: 'Início',    end: true },
  { to: '/dashboard/alunos',     icon: Users,           label: 'Alunos'    },
  { to: '/dashboard/cartilhas',  icon: BookOpen,        label: 'Cartilhas' },
  { to: '/dashboard/agenda',     icon: Calendar,        label: 'Agenda'    },
];

const MORE_ITEMS = [
  { to: '/dashboard/treinos',    icon: Dumbbell,      label: 'Treinos',       color: '#8B5CF6', bg: '#F5F3FF' },
  { to: '/dashboard/chat',       icon: MessageCircle, label: 'Chat',          color: '#3B82F6', bg: '#EFF6FF' },
  { to: '/dashboard/frequencia', icon: ClipboardList, label: 'Frequência',    color: '#10B981', bg: '#ECFDF5' },
  { to: '/dashboard/financeiro', icon: DollarSign,    label: 'Financeiro',    color: '#F59E0B', bg: '#FFFBEB' },
  { to: '/dashboard/whatsapp',   icon: Bell,          label: 'Notificações',  color: '#8B5CF6', bg: '#F5F3FF' },
  { to: '/dashboard/perfil',     icon: Settings,      label: 'Meu Perfil',    color: '#6B7280', bg: '#F9FAFB' },
];

const MORE_PATHS = MORE_ITEMS.map(i => i.to);

export default function PersonalBottomNav() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const isMoreActive = MORE_PATHS.some(p => pathname.startsWith(p));

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleMoreItem = (to) => { navigate(to); setOpen(false); };

  return (
    <nav className="personal-bottom-nav" style={{ gap: 0 }}>
      {TABS.map(({ to, icon: Icon, label, end }) => (
        <NavLink key={to} to={to} end={end}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 4px', textDecoration: 'none', gap: 3 }}
        >
          {({ isActive }) => (
            <>
              <div style={{
                width: 48, height: 28, borderRadius: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isActive ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)' : 'transparent',
                transition: 'background 0.2s',
              }}>
                <Icon size={18} color={isActive ? 'white' : '#9CA3AF'} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? '#3B82F6' : '#9CA3AF', letterSpacing: '-0.01em' }}>{label}</span>
            </>
          )}
        </NavLink>
      ))}

      <div ref={menuRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <button onClick={() => setOpen(o => !o)}
          style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 4px', background: 'none', border: 'none', cursor: 'pointer', gap: 3 }}>
          <div style={{
            width: 48, height: 28, borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isMoreActive || open ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)' : 'transparent',
            transition: 'background 0.2s',
          }}>
            <MoreHorizontal size={18} color={isMoreActive || open ? 'white' : '#9CA3AF'} strokeWidth={isMoreActive || open ? 2.5 : 2} />
          </div>
          <span style={{ fontSize: 10, fontWeight: isMoreActive || open ? 700 : 500, color: isMoreActive || open ? '#3B82F6' : '#9CA3AF', letterSpacing: '-0.01em' }}>Mais</span>
        </button>

        {open && (
          <div style={{
            position: 'absolute', bottom: 'calc(100% + 10px)', right: -8,
            background: 'white', borderRadius: 18,
            boxShadow: '0 -8px 32px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)',
            border: '1px solid #F1F5F9', overflow: 'hidden', minWidth: 210, zIndex: 70,
          }}>
            <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Mais opções</span>
            </div>
            {MORE_ITEMS.map(({ to, icon: Icon, label, color, bg }) => {
              const isActive = pathname.startsWith(to);
              return (
                <button key={to} onClick={() => handleMoreItem(to)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', background: isActive ? bg : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #F9FAFB' }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F9FAFB'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: isActive ? bg : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={17} color={isActive ? color : '#6B7280'} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: isActive ? 700 : 500, color: isActive ? color : '#374151', flex: 1 }}>{label}</span>
                  {isActive && <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />}
                </button>
              );
            })}
            <button onClick={() => { logout(); navigate('/login'); setOpen(false); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <LogOut size={17} color="#EF4444" />
              </div>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#EF4444' }}>Sair</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
