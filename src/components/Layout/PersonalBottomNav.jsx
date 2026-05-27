import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Dumbbell, MoreHorizontal, ClipboardList, DollarSign, Bell, Settings, MessageCircle } from 'lucide-react';

const TABS = [
  { to: '/dashboard',          icon: LayoutDashboard, label: 'Início',  end: true },
  { to: '/dashboard/alunos',   icon: Users,           label: 'Alunos'  },
  { to: '/dashboard/agenda',   icon: Calendar,        label: 'Agenda'  },
  { to: '/dashboard/treinos',  icon: Dumbbell,        label: 'Treinos' },
];

const MORE_ITEMS = [
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
  const isMoreActive = MORE_PATHS.some(p => pathname.startsWith(p));

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleMoreItem = (to) => { navigate(to); setOpen(false); };

  return (
    <nav className="personal-bottom-nav" style={{ position: 'relative' }}>
      {TABS.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          style={({ isActive }) => ({
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 3, padding: '6px 4px 2px', textDecoration: 'none',
            color: isActive ? '#3B82F6' : '#9CA3AF',
            fontSize: 10, fontWeight: isActive ? 700 : 500,
            transition: 'color 0.15s',
          })}
        >
          {({ isActive }) => (
            <>
              <div style={{
                width: 44, height: 30, borderRadius: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isActive ? 'rgba(59,130,246,0.1)' : 'transparent',
                transition: 'background 0.15s',
              }}>
                <Icon size={20} />
              </div>
              {label}
            </>
          )}
        </NavLink>
      ))}

      {/* Mais button with popup */}
      <div ref={menuRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 3, padding: '6px 4px 2px', background: 'none', border: 'none', cursor: 'pointer',
            color: isMoreActive || open ? '#3B82F6' : '#9CA3AF',
            fontSize: 10, fontWeight: isMoreActive || open ? 700 : 500,
          }}
        >
          <div style={{
            width: 44, height: 30, borderRadius: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isMoreActive || open ? 'rgba(59,130,246,0.1)' : 'transparent',
            transition: 'background 0.15s',
          }}>
            <MoreHorizontal size={20} />
          </div>
          Mais
        </button>

        {/* Popup menu */}
        {open && (
          <div style={{
            position: 'absolute', bottom: 'calc(100% + 8px)', right: 0,
            background: 'white', borderRadius: 16,
            boxShadow: '0 -4px 24px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #F1F5F9',
            overflow: 'hidden', minWidth: 200, zIndex: 70,
          }}>
            <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mais opções</span>
            </div>
            {MORE_ITEMS.map(({ to, icon: Icon, label, color, bg }) => {
              const isActive = pathname.startsWith(to);
              return (
                <button
                  key={to}
                  onClick={() => handleMoreItem(to)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', background: isActive ? bg : 'white',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    borderBottom: '1px solid #F9FAFB',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F9FAFB'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'white'; }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: isActive ? bg : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={17} color={isActive ? color : '#6B7280'} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: isActive ? 700 : 500, color: isActive ? color : '#374151' }}>{label}</span>
                  {isActive && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: color }} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
