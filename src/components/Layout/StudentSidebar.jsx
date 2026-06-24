import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Zap, LayoutDashboard, Dumbbell, Calendar, TrendingUp, History, MessageCircle, Camera, Heart, LogOut, X, Utensils, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const navItems = [
  { to: '/aluno/dashboard',    icon: LayoutDashboard, label: 'Início', end: true },
  { to: '/aluno/treinos',      icon: Dumbbell,         label: 'Meus Treinos' },
  { to: '/aluno/alimentacao',  icon: Utensils,         label: 'Alimentação' },
  { to: '/aluno/agenda',       icon: Calendar,         label: 'Agenda' },
  { to: '/aluno/progresso',    icon: TrendingUp,       label: 'Progresso' },
  { to: '/aluno/avaliacao',    icon: Activity,         label: 'Avaliação' },
  { to: '/aluno/historico',    icon: History,          label: 'Histórico' },
  { to: '/aluno/chat',         icon: MessageCircle,    label: 'Chat' },
  { to: '/aluno/fotos',        icon: Camera,           label: 'Fotos' },
  { to: '/aluno/saude',        icon: Heart,            label: 'Saúde' },
];

export default function StudentSidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { open, setOpen } = useSidebar();
  const [studentInfo, setStudentInfo] = useState(null);

  useEffect(() => {
    if (!user || !hasSupabase) return;
    supabase.from('students').select('plan, goal').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data) setStudentInfo(data); });
  }, [user?.id]);

  const handleLogout = () => { logout(); navigate('/aluno/login'); };
  const close = () => setOpen(false);

  const subtitle = studentInfo?.goal || (studentInfo?.plan ? `Plano ${studentInfo.plan}` : null);

  return (
    <>
      {open && (
        <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99 }} className="sidebar-overlay" />
      )}

      <aside className={`app-sidebar${open ? ' sidebar-open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 16px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}>
            <Zap size={16} color="white" fill="white" />
          </div>
          <span className="sidebar-logo-name">WAY FIT</span>
          <button onClick={close} className="sidebar-close-btn">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '12px 10px 4px' }}>
          <div style={{ background: 'var(--accent-bg)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(99,102,241,0.2)' }}>
            <p style={{ margin: 0, fontSize: 10, color: 'var(--accent-text)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Área do Aluno</p>
            <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 700, color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Aluno'}</p>
            {subtitle && (
              <span style={{ fontSize: 11, color: 'var(--accent-text)', fontWeight: 500 }}>{subtitle}</span>
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
              onClick={close}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="sidebar-item" style={{ width: '100%', border: 'none', textAlign: 'left', color: 'var(--red)' }}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>
    </>
  );
}
