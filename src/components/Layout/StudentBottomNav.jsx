import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, Calendar, TrendingUp, MoreHorizontal } from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';

const TABS = [
  { to: '/aluno/dashboard', icon: LayoutDashboard, label: 'Início',  end: true },
  { to: '/aluno/treinos',   icon: Dumbbell,        label: 'Treinos' },
  { to: '/aluno/agenda',    icon: Calendar,        label: 'Agenda'  },
  { to: '/aluno/progresso', icon: TrendingUp,      label: 'Progresso' },
];

const TAB_PATHS = new Set(TABS.map(t => t.to));

export default function StudentBottomNav() {
  const { setOpen } = useSidebar();
  const { pathname } = useLocation();
  const isMoreActive = pathname.startsWith('/aluno/') && !TAB_PATHS.has(pathname);

  return (
    <nav className="student-bottom-nav">
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

      <button className="bottom-nav-tab" onClick={() => setOpen(true)}>
        <div className="bottom-nav-pill" style={{ background: isMoreActive ? 'var(--accent)' : 'transparent' }}>
          <MoreHorizontal size={18} color={isMoreActive ? 'white' : 'var(--gray-400)'} strokeWidth={isMoreActive ? 2.5 : 1.8} />
        </div>
        <span className="bottom-nav-label" style={{ color: isMoreActive ? 'var(--accent)' : 'var(--gray-400)', fontWeight: isMoreActive ? 700 : 500 }}>
          Mais
        </span>
      </button>
    </nav>
  );
}
