import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, Search, ArrowLeft, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??';
}

const AVATAR_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];
function avatarColor(id) { return AVATAR_COLORS[String(id).charCodeAt(0) % AVATAR_COLORS.length]; }

function MessageBubble({ msg, isMe }) {
  return (
    <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
      <div style={{ maxWidth: '72%' }}>
        <div style={{
          padding: '10px 14px',
          borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isMe ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)' : 'var(--bg-surface)',
          color: isMe ? 'white' : 'var(--gray-900)',
          fontSize: 14, lineHeight: 1.5,
          boxShadow: isMe ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          {msg.text}
        </div>
        <p style={{ margin: '3px 0 0', fontSize: 10, color: '#9CA3AF', textAlign: isMe ? 'right' : 'left' }}>
          {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

function DateDivider({ dateStr }) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const label = dateStr === today ? 'Hoje' : dateStr === yesterday ? 'Ontem'
    : new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState({});       // { [studentId]: msg[] }
  const [unreadCount, setUnreadCount] = useState({});  // { [studentId]: number }
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef(null);
  const channelRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, selectedId]);

  // Load students
  useEffect(() => {
    if (!user) return;
    if (!hasSupabase) {
      setStudents([
        { id: 1, name: 'Lucas Mendes' },
        { id: 2, name: 'Ana Beatriz' },
      ]);
      setMessages({ 1: [{ id: 1, from_role: 'student', text: 'Olá professor!', created_at: new Date().toISOString() }] });
      setUnreadCount({ 1: 1 });
      setLoading(false);
      return;
    }

    supabase.from('students').select('id, name, color').eq('personal_id', user.id).order('name')
      .then(({ data }) => {
        setStudents(data || []);
        setLoading(false);
        if (data?.length) loadLastMessages(data.map(s => s.id));
      });
  }, [user?.id]);

  const loadLastMessages = async (studentIds) => {
    if (!studentIds.length) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .in('student_id', studentIds)
      .order('created_at', { ascending: false });

    if (!data) return;

    const grouped = {};
    const unread = {};
    data.forEach(msg => {
      const sid = String(msg.student_id);
      if (!grouped[sid]) grouped[sid] = [];
      grouped[sid].push(msg);
      if (msg.from_role === 'student' && !msg.read) {
        unread[sid] = (unread[sid] || 0) + 1;
      }
    });

    // Reverse so oldest first per student
    Object.keys(grouped).forEach(sid => grouped[sid].reverse());
    setMessages(grouped);
    setUnreadCount(unread);
  };

  // Realtime subscription
  useEffect(() => {
    if (!user || !hasSupabase) return;

    const channel = supabase
      .channel(`chat_personal_${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `personal_id=eq.${user.id}`,
      }, ({ new: msg }) => {
        const sid = String(msg.student_id);
        setMessages(prev => ({
          ...prev,
          [sid]: [...(prev[sid] || []).filter(m => m.id !== msg.id), msg],
        }));
        if (msg.from_role === 'student' && String(selectedId) !== sid) {
          setUnreadCount(prev => ({ ...prev, [sid]: (prev[sid] || 0) + 1 }));
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, selectedId]);

  // Polling fallback: busca mensagens novas a cada 3s na conversa aberta
  useEffect(() => {
    if (!selectedId || !hasSupabase) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('student_id', selectedId)
        .order('created_at');
      if (data) setMessages(prev => ({ ...prev, [String(selectedId)]: data }));
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedId]);

  const selectStudent = async (student) => {
    setSelectedId(student.id);
    setUnreadCount(prev => ({ ...prev, [String(student.id)]: 0 }));

    if (!hasSupabase) return;

    // Load full conversation if not yet loaded
    if (!messages[String(student.id)]?.length) {
      setLoadingMsgs(true);
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('student_id', student.id)
        .order('created_at');
      setMessages(prev => ({ ...prev, [String(student.id)]: data || [] }));
      setLoadingMsgs(false);
    }

    // Mark student messages as read
    supabase.from('messages').update({ read: true })
      .eq('student_id', student.id)
      .eq('from_role', 'student')
      .then(() => {});
  };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending || !selectedId) return;
    setSending(true);

    const optimistic = {
      id: `tmp-${Date.now()}`,
      student_id: selectedId,
      personal_id: user.id,
      from_role: 'personal',
      text: text.trim(),
      created_at: new Date().toISOString(),
    };

    const sid = String(selectedId);
    setMessages(prev => ({ ...prev, [sid]: [...(prev[sid] || []), optimistic] }));
    setText('');

    if (hasSupabase) {
      const { data } = await supabase
        .from('messages')
        .insert({ student_id: selectedId, personal_id: user.id, from_role: 'personal', text: optimistic.text })
        .select().single();

      if (data) {
        setMessages(prev => ({
          ...prev,
          [sid]: prev[sid].map(m => m.id === optimistic.id ? data : m),
        }));
      }
    }
    setSending(false);
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedStudent = students.find(s => String(s.id) === String(selectedId));
  const currentMessages = messages[String(selectedId)] || [];

  // Group messages by date
  const grouped = [];
  let lastDate = null;
  currentMessages.forEach(msg => {
    const date = msg.created_at.slice(0, 10);
    if (date !== lastDate) { grouped.push({ type: 'date', date }); lastDate = date; }
    grouped.push({ type: 'msg', msg });
  });

  const isConvOpen = selectedId !== null;

  return (
    <div className="page-padding" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--gray-900)' }}>Chat</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--gray-400)' }}>Mensagens com seus alunos</p>
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Student list — hidden on mobile when conv is open */}
        <div className={`chat-sidebar${isConvOpen ? ' chat-sidebar-hidden' : ''}`} style={{ width: 280, background: 'var(--bg-surface)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #F3F4F6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-page)', borderRadius: 10, padding: '8px 12px', border: '1px solid var(--border)' }}>
              <Search size={14} color="#9CA3AF" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar aluno..."
                style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, color: '#374151', WebkitTextFillColor: '#374151', width: '100%', padding: 0 }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center' }}><Loader size={20} color="#9CA3AF" /></div>
            ) : filteredStudents.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                {students.length === 0 ? 'Nenhum aluno cadastrado' : 'Nenhum resultado'}
              </div>
            ) : filteredStudents.map(student => {
              const sid = String(student.id);
              const lastMsg = (messages[sid] || []).slice(-1)[0];
              const unread = unreadCount[sid] || 0;
              const isActive = String(selectedId) === sid;
              const color = student.color || avatarColor(student.id);

              return (
                <button
                  key={student.id}
                  onClick={() => selectStudent(student)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', background: isActive ? 'var(--accent-bg)' : 'var(--bg-surface)',
                    border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                    textAlign: 'left', transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-page)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-surface)'; }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                    {getInitials(student.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: unread ? 700 : 600, color: 'var(--gray-900)' }}>{student.name.split(' ')[0]}</span>
                      {lastMsg && <span style={{ fontSize: 10, color: '#9CA3AF' }}>{new Date(lastMsg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: unread ? '#374151' : '#9CA3AF', fontWeight: unread ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lastMsg ? (lastMsg.from_role === 'personal' ? `Você: ${lastMsg.text}` : lastMsg.text) : 'Nenhuma mensagem ainda'}
                    </p>
                  </div>
                  {unread > 0 && (
                    <div style={{ minWidth: 18, height: 18, borderRadius: 10, background: '#EF4444', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0 }}>
                      {unread}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversation panel */}
        <div className={`chat-conv${isConvOpen ? ' chat-conv-open' : ''}`} style={{ flex: 1, background: 'var(--bg-surface)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selectedId ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', gap: 12 }}>
              <MessageCircle size={48} color="#E5E7EB" />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--gray-700)' }}>Selecione um aluno</p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-400)' }}>Clique em um aluno para ver a conversa</p>
            </div>
          ) : (
            <>
              {/* Conv header */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="chat-back-btn" onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6B7280', display: 'none' }}>
                  <ArrowLeft size={20} />
                </button>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: selectedStudent?.color || '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {getInitials(selectedStudent?.name || '')}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--gray-900)' }}>{selectedStudent?.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#10B981' }}>Online</p>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
                {loadingMsgs ? (
                  <div style={{ textAlign: 'center', marginTop: 40 }}><Loader size={20} color="#9CA3AF" /></div>
                ) : grouped.length === 0 ? (
                  <div style={{ textAlign: 'center', marginTop: 40, color: '#9CA3AF' }}>
                    <MessageCircle size={32} color="#E5E7EB" style={{ marginBottom: 8 }} />
                    <p style={{ margin: 0, fontSize: 13 }}>Nenhuma mensagem ainda. Diga olá!</p>
                  </div>
                ) : grouped.map((item, i) =>
                  item.type === 'date'
                    ? <DateDivider key={`d-${i}`} dateStr={item.date} />
                    : <MessageBubble key={item.msg.id} msg={item.msg} isMe={item.msg.from_role === 'personal'} />
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={send} style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                <input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 24, padding: '10px 16px', fontSize: 14, outline: 'none', background: 'var(--bg-page)', color: 'var(--gray-900)', WebkitTextFillColor: 'var(--gray-900)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.background = 'var(--bg-surface)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-page)'; }}
                />
                <button
                  type="submit"
                  disabled={!text.trim() || sending}
                  style={{ width: 42, height: 42, borderRadius: '50%', background: text.trim() ? 'linear-gradient(135deg,#3B82F6,#8B5CF6)' : '#F3F4F6', border: 'none', cursor: text.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}
                >
                  <Send size={16} color={text.trim() ? 'white' : '#9CA3AF'} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
