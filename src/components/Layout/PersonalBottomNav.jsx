import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, Dumbbell, Salad } from 'lucide-react';

const TABS = [
  { to: '/dashboard',          icon: LayoutDashboard, label: 'Início',   end: true },
  { to: '/dashboard/alunos',   icon: Users,           label: 'Alunos'   },
  { to: '/dashboard/treinos',  icon: Dumbbell,        label: 'Treinos'  },
  { to: '/dashboard/agenda',   icon: Calendar,        label: 'Agenda'   },
  { to: '/dashboard/nutricao', icon: Salad,           label: 'Nutrição' },
];

export default function PersonalBottomNav() {
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
    </nav>
  );
}
