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

      <aside className={`app-sidebar${open ? ' sidebar-open' : ''}`} style={{ width: 240, minHeight: '100vh', background: 'white', borderRight: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', padding: '20px 16px', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingLeft: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={18} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 19, fontWeight: 800, flex: 1, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            WAY FIT
          </span>
          <button onClick={close} className="sidebar-close-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6B7280' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)', borderRadius: 10, padding: '10px 14px', marginBottom: 18, border: '1px solid #DBEAFE' }}>
          <p style={{ margin: 0, fontSize: 11, color: '#6B7280', fontWeight: 500 }}>Área do Aluno</p>
          <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Aluno'}</p>
          {subtitle && (
            <span style={{ fontSize: 11, color: '#8B5CF6', fontWeight: 600 }}>{subtitle}</span>
          )}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
              onClick={close}
              style={{ fontSize: 13 }}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <button onClick={handleLogout} className="sidebar-item" style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', color: '#EF4444', marginTop: 8, fontSize: 13 }}>
          <LogOut size={17} /> Sair
        </button>
      </aside>
    </>
  );
}
