import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, Dumbbell, MoreHorizontal,
  ClipboardList, DollarSign, Bell, Settings, MessageCircle,
  LogOut, Salad, BookOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const TABS = [
  { to: '/dashboard',          icon: LayoutDashboard, label: 'Início',  end: true },
  { to: '/dashboard/alunos',   icon: Users,           label: 'Alunos'  },
  { to: '/dashboard/treinos',  icon: Dumbbell,        label: 'Treinos' },
  { to: '/dashboard/agenda',   icon: Calendar,        label: 'Agenda'  },
];

const MORE_ITEMS = [
  { to: '/dashboard/nutricao',   icon: Salad,         label: 'Nutrição'      },
  { to: '/dashboard/cartilhas',  icon: BookOpen,      label: 'Cartilhas'     },
  { to: '/dashboard/chat',       icon: MessageCircle, label: 'Chat'          },
  { to: '/dashboard/financeiro', icon: DollarSign,    label: 'Financeiro'    },
  { to: '/dashboard/frequencia', icon: ClipboardList, label: 'Frequência'    },
  { to: '/dashboard/whatsapp',   icon: Bell,          label: 'Notificações'  },
  { to: '/dashboard/perfil',     icon: Settings,      label: 'Meu Perfil'    },
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
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const go = to => { navigate(to); setOpen(false); };

  return (
    <nav className="personal-bottom-nav">
      {TABS.map(({ to, icon: Icon, label, end }) => (
        <NavLink key={to} to={to} end={end} className="bottom-nav-tab">
          {({ isActive }) => (
            <>
              <div className="bottom-nav-pill" style={{ background: isActive ? 'var(--accent)' : 'transparent' }}>
                <Icon size={18} color={isActive ? 'white' : 'var(--gray-400)'} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span className="bottom-nav-label" style={{ color: isActive ? 'var(--accent)' : 'var(--gray-400)', fontWeight: isActive ? 700 : 500 }}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}

      {/* More menu */}
      <div ref={menuRef} style={{ flex: 1, position: 'relative', display: 'flex' }}>
        <button className="bottom-nav-tab" style={{ flex: 1 }} onClick={() => setOpen(o => !o)}>
          <div className="bottom-nav-pill" style={{ background: isMoreActive || open ? 'var(--accent)' : 'transparent' }}>
            <MoreHorizontal size={18} color={isMoreActive || open ? 'white' : 'var(--gray-400)'} strokeWidth={isMoreActive || open ? 2.5 : 1.8} />
          </div>
          <span className="bottom-nav-label" style={{ color: isMoreActive || open ? 'var(--accent)' : 'var(--gray-400)', fontWeight: isMoreActive || open ? 700 : 500 }}>
            Mais
          </span>
        </button>

        {open && (
          <div style={{
            position: 'absolute', bottom: 'calc(100% + 8px)', right: 0,
            background: 'white', borderRadius: 16,
            boxShadow: '0 -4px 32px rgba(0,0,0,0.12)',
            border: '1px solid var(--border)', overflow: 'hidden', minWidth: 210, zIndex: 70,
          }}>
            <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Mais opções</span>
            </div>
            {MORE_ITEMS.map(({ to, icon: Icon, label }) => {
              const isActive = pathname.startsWith(to);
              return (
                <button key={to} onClick={() => go(to)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 14px', background: isActive ? 'var(--accent-bg)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--gray-50)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: isActive ? 'var(--accent-bg)' : 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color={isActive ? 'var(--accent-text)' : 'var(--gray-500)'} />
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--accent-text)' : 'var(--gray-700)', flex: 1 }}>{label}</span>
                  {isActive && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />}
                </button>
              );
            })}
            <button onClick={() => { logout(); navigate('/login'); setOpen(false); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => e.currentTarget.style.background = '#FFF5F5'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 32, height: 32, borderRadius: 9, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <LogOut size={16} color="var(--red)" />
              </div>
              <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--red)' }}>Sair</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
