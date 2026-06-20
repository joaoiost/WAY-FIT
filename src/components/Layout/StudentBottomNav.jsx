import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, Salad, MessageCircle, TrendingUp } from 'lucide-react';

const TABS = [
  { to: '/aluno/dashboard',   icon: LayoutDashboard, label: 'Início',   end: true },
  { to: '/aluno/treinos',     icon: Dumbbell,        label: 'Treinos'  },
  { to: '/aluno/alimentacao', icon: Salad,           label: 'Nutrição' },
  { to: '/aluno/chat',        icon: MessageCircle,   label: 'Chat'     },
  { to: '/aluno/progresso',   icon: TrendingUp,      label: 'Progresso'},
];

export default function StudentBottomNav() {
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
    </nav>
  );
}
