import { useState, useEffect, useRef } from 'react';
import { Bell, Menu, CheckCheck, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { useNotifications } from '../../context/NotificationsContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase, hasSupabase } from '../../lib/supabase';

const TYPE_COLORS = {
  payment: '#EF4444', absence: '#F59E0B', appointment: '#3B82F6',
  student: '#10B981', workout: '#8B5CF6', water: '#60A5FA',
  achievement: '#F59E0B', message: '#10B981', progress: '#8B5CF6',
};

const PAGE_NAMES = {
  '/dashboard':            'Dashboard',
  '/dashboard/alunos':     'Alunos',
  '/dashboard/treinos':    'Treinos',
  '/dashboard/financeiro': 'Financeiro',
  '/dashboard/whatsapp':   'Notificações',
  '/dashboard/chat':       'Chat',
  '/dashboard/perfil':     'Meu Perfil',
  '/dashboard/frequencia': 'Frequência',
  '/aluno/dashboard':      'Início',
  '/aluno/treinos':        'Meus Treinos',
  '/aluno/agenda':         'Agenda',
  '/aluno/progresso':      'Progresso',
  '/aluno/historico':      'Histórico',
  '/aluno/chat':           'Chat',
  '/aluno/fotos':          'Fotos & Progresso',
  '/aluno/saude':          'Saúde',
};

export default function Header() {
  const { user } = useAuth();
  const { setOpen } = useSidebar();
  const { notifications, unread, markRead, markAllRead } = useNotifications();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [showPanel, setShowPanel]     = useState(false);
  const [showSearch, setShowSearch]   = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const panelRef  = useRef(null);
  const searchRef = useRef(null);
  const inputRef  = useRef(null);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = user?.name?.split(' ')[0] || 'Usuário';
  const pageName  = PAGE_NAMES[pathname] ?? (pathname.startsWith('/dashboard/alunos/') ? 'Perfil do Aluno' : '');
  const initials  = user?.avatar || user?.name?.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || 'WF';

  useEffect(() => {
    if (!showSearch) return;
    setTimeout(() => inputRef.current?.focus(), 50);
    const handler = e => { if (searchRef.current && !searchRef.current.contains(e.target)) closeSearch(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSearch]);

  useEffect(() => {
    if (!searchQuery.trim() || user?.role !== 'personal') { setSearchResults([]); return; }
    const t = setTimeout(() => {
      if (hasSupabase) {
        supabase.from('students').select('id, name, goal, plan, status')
          .eq('personal_id', user.id).ilike('name', `%${searchQuery}%`).limit(6)
          .then(({ data }) => setSearchResults(data || []));
      }
    }, 200);
    return () => clearTimeout(t);
  }, [searchQuery, user?.id]);

  useEffect(() => {
    if (!showPanel) return;
    const handler = e => { if (panelRef.current && !panelRef.current.contains(e.target)) setShowPanel(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPanel]);

  const closeSearch = () => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); };

  return (
    <header className="app-header">

      {/* Left */}
      <div className="header-left">
        <button className="hamburger-btn" onClick={() => setOpen(true)} aria-label="Menu">
          <Menu size={21} />
        </button>

        <div style={{ minWidth: 0 }}>
          <h1 className="header-greeting">{greeting}, {firstName}! 👋</h1>
          <h1 className="header-pagename">{pageName}</h1>
          <p className="header-date">
            {now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="header-right">

        {/* Search — personal only */}
        {user?.role === 'personal' && (
          <div ref={searchRef} style={{ position: 'relative' }}>
            {showSearch ? (
              <div className="header-search-box">
                <Search size={14} color="var(--gray-400)" />
                <input
                  ref={inputRef}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar aluno..."
                />
                <button onClick={closeSearch} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--gray-400)', lineHeight: 0 }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button className="header-icon-btn" onClick={() => setShowSearch(true)} aria-label="Buscar">
                <Search size={18} />
              </button>
            )}

            {showSearch && searchQuery && (
              <div className="search-dropdown">
                {searchResults.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: 'var(--gray-400)' }}>
                    Nenhum aluno encontrado
                  </div>
                ) : searchResults.map(s => (
                  <button key={s.id}
                    onClick={() => { navigate(`/dashboard/alunos/${s.id}`); closeSearch(); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                      {s.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)' }}>{s.plan}{s.goal ? ` · ${s.goal}` : ''}</p>
                    </div>
                    <span className={`badge badge-${s.status === 'ativo' ? 'green' : 'yellow'}`} style={{ fontSize: 10 }}>
                      {s.status === 'ativo' ? 'Ativo' : 'Pendente'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bell */}
        <div ref={panelRef} style={{ position: 'relative' }}>
          <button
            className={`header-icon-btn${showPanel ? ' active' : ''}`}
            onClick={() => setShowPanel(p => !p)}
            aria-label="Notificações"
          >
            <Bell size={19} />
            {unread > 0 && (
              <span className="header-notif-dot">{unread > 9 ? '9+' : unread}</span>
            )}
          </button>

          {showPanel && (
            <div className="notif-panel notif-panel-mobile">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-900)' }}>Notificações</span>
                  {unread > 0 && (
                    <span style={{ background: 'var(--red)', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>{unread}</span>
                  )}
                </div>
                {unread > 0 && (
                  <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>
                    <CheckCheck size={14} /> Marcar todas
                  </button>
                )}
              </div>

              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>
                    <Bell size={28} color="var(--gray-200)" style={{ display: 'block', margin: '0 auto 10px' }} />
                    Nenhuma notificação
                  </div>
                ) : notifications.map(n => (
                  <div key={n.id} onClick={() => markRead(n.id)}
                    style={{ display: 'flex', gap: 12, padding: '11px 14px', cursor: 'pointer', background: n.read ? 'var(--bg-surface)' : 'var(--accent-bg)', borderBottom: '1px solid var(--border-light)', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                    onMouseLeave={e => e.currentTarget.style.background = n.read ? 'var(--bg-surface)' : 'var(--accent-bg)'}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${TYPE_COLORS[n.type] || 'var(--gray-400)'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
                      {n.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: 'var(--gray-900)', lineHeight: 1.3 }}>{n.title}</span>
                        <span style={{ fontSize: 10, color: 'var(--gray-400)', flexShrink: 0, marginTop: 1 }}>{n.time}</span>
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.4 }}>{n.message}</p>
                    </div>
                    {!n.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 5 }} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <Link to={user?.role === 'student' ? '/aluno/saude' : '/dashboard/perfil'} className="header-avatar" title="Meu perfil">
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt="avatar" />
            : <span>{initials}</span>
          }
        </Link>
      </div>
    </header>
  );
}
