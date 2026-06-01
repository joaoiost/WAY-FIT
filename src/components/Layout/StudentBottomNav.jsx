import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, Calendar, TrendingUp, MoreHorizontal } from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';

const TABS = [
  { to: '/aluno/dashboard', icon: LayoutDashboard, label: 'Início', end: true },
  { to: '/aluno/treinos',   icon: Dumbbell,         label: 'Treinos' },
  { to: '/aluno/agenda',    icon: Calendar,          label: 'Agenda' },
  { to: '/aluno/progresso', icon: TrendingUp,        label: 'Progresso' },
];

export default function StudentBottomNav() {
  const { setOpen } = useSidebar();
  const { pathname } = useLocation();
  const isMoreActive = ['/aluno/historico', '/aluno/chat', '/aluno/fotos', '/aluno/saude'].includes(pathname);

  return (
    <nav className="student-bottom-nav" style={{ gap: 0 }}>
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

      <button onClick={() => setOpen(true)}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 4px', background: 'none', border: 'none', cursor: 'pointer', gap: 3 }}>
        <div style={{
          width: 48, height: 28, borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isMoreActive ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)' : 'transparent',
          transition: 'background 0.2s',
        }}>
          <MoreHorizontal size={18} color={isMoreActive ? 'white' : '#9CA3AF'} strokeWidth={isMoreActive ? 2.5 : 2} />
        </div>
        <span style={{ fontSize: 10, fontWeight: isMoreActive ? 700 : 500, color: isMoreActive ? '#3B82F6' : '#9CA3AF', letterSpacing: '-0.01em' }}>Mais</span>
      </button>
    </nav>
  );
}
