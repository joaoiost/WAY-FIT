import { useState, useEffect, useRef } from 'react';
import { Bell, Menu, CheckCheck, Search, X } from 'lucide-react';
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
  '/dashboard/agenda':     'Agenda',
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
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!showSearch) return;
    setTimeout(() => searchInputRef.current?.focus(), 50);
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSearch]);

  useEffect(() => {
    if (!searchQuery.trim() || !user || user.role !== 'personal') { setSearchResults([]); return; }
    const timeout = setTimeout(() => {
      if (hasSupabase) {
        supabase.from('students').select('id, name, goal, plan, status').eq('personal_id', user.id)
          .ilike('name', `%${searchQuery}%`).limit(6)
          .then(({ data }) => setSearchResults(data || []));
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [searchQuery, user?.id]);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = user?.name?.split(' ')[0] || 'Usuário';
  const pageName = PAGE_NAMES[pathname]
    ?? (pathname.startsWith('/dashboard/alunos/') ? 'Perfil do Aluno' : '');

  useEffect(() => {
    if (!showPanel) return;
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setShowPanel(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPanel]);

  return (
    <header style={{ background: 'white', borderBottom: '1px solid #F1F5F9', padding: '0 20px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <button className="hamburger-btn" onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: '#374151', flexShrink: 0, display: 'none' }}>
          <Menu size={22} />
        </button>

        {/* Desktop: greeting. Mobile: page name */}
        <div style={{ minWidth: 0 }}>
          <h1 className="header-greeting" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
            {greeting}, {firstName}! 👋
          </h1>
          <h1 className="header-pagename" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827', display: 'none' }}>
            {pageName}
          </h1>
          <p className="header-date" style={{ margin: 0, fontSize: 12, color: '#6B7280', textTransform: 'capitalize' }}>
            {now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* Global search — personal only */}
        {user?.role === 'personal' && (
          <div ref={searchRef} style={{ position: 'relative' }}>
            {showSearch ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F9FAFB', border: '1.5px solid #3B82F6', borderRadius: 10, padding: '6px 10px', width: 220 }}>
                <Search size={14} color="#9CA3AF" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar aluno..."
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, flex: 1, padding: 0, boxShadow: 'none' }}
                />
                <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#9CA3AF' }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowSearch(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex', color: '#6B7280', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <Search size={18} />
              </button>
            )}
            {showSearch && searchQuery && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 260, background: 'white', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #F1F5F9', zIndex: 200, overflow: 'hidden' }}>
                {searchResults.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>Nenhum aluno encontrado</div>
                ) : searchResults.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { navigate(`/dashboard/alunos/${s.id}`); setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #F9FAFB' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                      {s.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>{s.plan}{s.goal ? ` · ${s.goal}` : ''}</p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: s.status === 'ativo' ? '#D1FAE5' : '#FEF3C7', color: s.status === 'ativo' ? '#065F46' : '#92400E', flexShrink: 0 }}>
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
            onClick={() => setShowPanel(p => !p)}
            style={{ position: 'relative', background: showPanel ? '#F3F4F6' : 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex', transition: 'background 0.15s' }}
          >
            <Bell size={20} color="#6B7280" />
            {unread > 0 && (
              <span style={{ position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: '50%', background: '#EF4444', color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {showPanel && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 360, background: 'white', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid #F1F5F9', zIndex: 200, overflow: 'hidden' }} className="notif-panel-mobile">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #F3F4F6' }}>
                <div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Notificações</span>
                  {unread > 0 && <span style={{ marginLeft: 8, background: '#EF4444', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>{unread}</span>}
                </div>
                {unread > 0 && (
                  <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', fontSize: 12, fontWeight: 600 }}>
                    <CheckCheck size={14} /> Marcar todas
                  </button>
                )}
              </div>

              <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
                    <Bell size={32} color="#E5E7EB" style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                    Nenhuma notificação
                  </div>
                ) : notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    style={{ display: 'flex', gap: 12, padding: '12px 16px', cursor: 'pointer', background: n.read ? 'white' : '#F8FAFF', borderBottom: '1px solid #F9FAFB', transition: 'background 0.15s' }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${TYPE_COLORS[n.type] || '#6B7280'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      {n.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: '#111827' }}>{n.title}</span>
                        <span style={{ fontSize: 10, color: '#9CA3AF', flexShrink: 0 }}>{n.time}</span>
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6B7280', lineHeight: 1.4 }}>{n.message}</p>
                    </div>
                    {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3B82F6', flexShrink: 0, marginTop: 4 }} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <a href="/dashboard/perfil" style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0, textDecoration: 'none', boxShadow: '0 2px 8px rgba(59,130,246,0.25)' }}>
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span>{user?.avatar || 'WF'}</span>
          }
        </a>
      </div>
    </header>
  );
}
