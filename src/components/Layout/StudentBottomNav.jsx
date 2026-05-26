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
    <nav className="student-bottom-nav">
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
                width: 44, height: 30, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
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

      <button
        onClick={() => setOpen(true)}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 3, padding: '6px 4px 2px', background: 'none', border: 'none', cursor: 'pointer',
          color: isMoreActive ? '#3B82F6' : '#9CA3AF',
          fontSize: 10, fontWeight: isMoreActive ? 700 : 500,
        }}
      >
        <div style={{
          width: 44, height: 30, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isMoreActive ? 'rgba(59,130,246,0.1)' : 'transparent',
        }}>
          <MoreHorizontal size={20} />
        </div>
        Mais
      </button>
    </nav>
  );
}
