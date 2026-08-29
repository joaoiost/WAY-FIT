import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  Zap, LayoutDashboard, Users, Dumbbell, DollarSign, Bell, LogOut,
  Settings, ClipboardList, MessageCircle, Salad, Apple, BookOpen,
  UsersRound, SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const NAV = [
  {
    items: [
      { to: '/v2/dashboard', icon: LayoutDashboard, label: 'Início', end: true },
      { to: '/v2/alunos', icon: Users, label: 'Alunos' },
      { to: '/v2/treinos', icon: Dumbbell, label: 'Treinos' },
      { to: '/v2/cartilhas', icon: BookOpen, label: 'Cartilhas' },
      { to: '/v2/turmas', icon: UsersRound, label: 'Turmas' },
    ],
  },
  {
    label: 'Nutrição',
    items: [
      { to: '/v2/nutricao', icon: Salad, label: 'Planos Alimentares' },
      { to: '/v2/nutricao/alimentos', icon: Apple, label: 'Banco de Alimentos' },
    ],
  },
  {
    label: 'Rotina',
    items: [
      { to: '/v2/chat', icon: MessageCircle, label: 'Chat' },
      { to: '/v2/frequencia', icon: ClipboardList, label: 'Frequência' },
      { to: '/v2/financeiro', icon: DollarSign, label: 'Financeiro' },
    ],
  },
  {
    label: 'Conta',
    items: [
      { to: '/v2/notificacoes', icon: Bell, label: 'Notificações' },
      { to: '/v2/perfil', icon: Settings, label: 'Meu Perfil' },
      { to: '/v2/configuracoes', icon: SlidersHorizontal, label: 'Configurações' },
    ],
  },
];

export default function SidebarV2({ mobileOpen = false, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };
  const initials = user?.avatar || user?.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'WF';

  return (
    <>
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-ink-900/40 z-30"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`w-60 shrink-0 h-screen fixed lg:sticky top-0 flex flex-col border-r border-ink-100 bg-white z-40 transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-ink-100 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
          <Zap size={16} className="text-white fill-white" />
        </div>
        <span className="text-[15px] font-extrabold text-ink-900 tracking-tight">WAY FIT</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5">
        {NAV.map((section, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {section.label && (
              <p className="px-3 mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">
                {section.label}
              </p>
            )}
            {section.items.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-700 hover:bg-ink-50'
                  }`
                }
              >
                <Icon size={16} strokeWidth={2} />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User card */}
      <Link to="/v2/perfil" className="flex items-center gap-2.5 px-4 py-3 border-t border-ink-100 hover:bg-ink-50 transition-colors">
        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[11px] font-bold shrink-0 overflow-hidden">
          {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink-900 truncate">{user?.name || 'Personal'}</p>
          <p className="text-[11.5px] text-ink-500 truncate">{user?.email || ''}</p>
        </div>
      </Link>

      <button
        onClick={handleLogout}
        className="flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium text-danger-500 hover:bg-danger-50 transition-colors border-t border-ink-100"
      >
        <LogOut size={15} /> Sair
      </button>
      </aside>
    </>
  );
}
