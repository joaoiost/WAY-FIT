import { useState, useRef, useEffect } from 'react';
import { Send, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??';
}

function PersonalAvatar({ avatar, initials, size = 30 }) {
  if (avatar) {
    return (
      <img src={avatar} alt="personal" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.37, fontWeight: 700, color: 'white', flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function MessageBubble({ msg, isMe, personalInitials, personalAvatar }) {
  return (
    <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      {!isMe && (
        <div style={{ marginRight: 8, alignSelf: 'flex-end' }}>
          <PersonalAvatar avatar={personalAvatar} initials={personalInitials} size={30} />
        </div>
      )}
      <div style={{ maxWidth: '72%' }}>
        <div style={{ padding: '10px 14px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isMe ? 'var(--accent)' : 'white', color: isMe ? 'white' : '#111827', fontSize: 14, lineHeight: 1.5, boxShadow: isMe ? 'none' : '0 1px 3px rgba(0,0,0,0.08)' }}>
          {msg.text}
        </div>
        <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--gray-400)', textAlign: isMe ? 'right' : 'left' }}>
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
      <div style={{ flex: 1, height: 1, background: 'var(--bg-page)' }} />
      <span style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--bg-page)' }} />
    </div>
  );
}

const MOCK_MSGS = [
  { id: 1, from_role: 'personal', text: 'Olá! Bem-vindo ao chat. Pode me chamar aqui a qualquer hora.', created_at: new Date(Date.now() - 3600000).toISOString() },
];

export default function ChatAluno() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [personalName, setPersonalName] = useState('Personal');
  const [personalAvatar, setPersonalAvatar] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [personalId, setPersonalId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!user) return;

    if (!hasSupabase) {
      setMessages(MOCK_MSGS);
      setPersonalName('Personal');
      setLoading(false);
      return;
    }

    let channel;

    const load = async () => {
      // Busca dados do aluno e personal
      const { data: student } = await supabase
        .from('students')
        .select('id, personal_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!student) { setMessages(MOCK_MSGS); setLoading(false); return; }

      setStudentId(student.id);
      setPersonalId(student.personal_id);

      // Busca nome e foto do personal
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', student.personal_id)
        .maybeSingle();
      if (profile?.name) setPersonalName(profile.name);
      if (profile?.avatar_url) setPersonalAvatar(profile.avatar_url);

      // Carrega mensagens
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('student_id', student.id)
        .order('created_at');

      setMessages(msgs?.length ? msgs : MOCK_MSGS);
      setLoading(false);

      // Realtime
      channel = supabase
        .channel(`chat_${student.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
          filter: `student_id=eq.${student.id}`,
        }, payload => {
          setMessages(prev => {
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        })
        .subscribe();
    };

    load();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [user?.id]);

  // Polling fallback: busca mensagens novas a cada 3s
  useEffect(() => {
    if (!studentId || !hasSupabase) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at');
      if (data?.length) setMessages(data);
    }, 3000);
    return () => clearInterval(interval);
  }, [studentId]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);

    const newMsg = {
      from_role: 'student',
      text: text.trim(),
      created_at: new Date().toISOString(),
    };

    if (hasSupabase && studentId) {
      const { data } = await supabase
        .from('messages')
        .insert({ student_id: studentId, personal_id: personalId, from_role: 'student', text: text.trim() })
        .select().single();
      if (data) {
        setMessages(prev => prev.find(m => m.id === data.id) ? prev : [...prev, data]);
      } else {
        setMessages(prev => [...prev, { ...newMsg, id: Date.now() }]);
      }
    } else {
      setMessages(prev => [...prev, { ...newMsg, id: Date.now() }]);
    }

    setText('');
    setSending(false);
  };

  // Agrupa mensagens por data
  const grouped = messages.reduce((acc, msg) => {
    const date = msg.created_at.slice(0, 10);
    const last = acc[acc.length - 1];
    if (!last || last.date !== date) acc.push({ date, msgs: [msg] });
    else last.msgs.push(msg);
    return acc;
  }, []);

  const personalInitials = getInitials(personalName);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', maxHeight: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <PersonalAvatar avatar={personalAvatar} initials={personalInitials} size={42} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--gray-900)' }}>{personalName}</p>
          <p style={{ margin: 0, fontSize: 12, color: '#10B981', fontWeight: 600 }}>Personal Trainer</p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: 'var(--bg-page)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <Loader size={24} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.date}>
              <DateDivider dateStr={group.date} />
              {group.msgs.map(msg => (
                <MessageBubble key={msg.id} msg={msg} isMe={msg.from_role === 'student'} personalInitials={personalInitials} personalAvatar={personalAvatar} />
              ))}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)', padding: '12px 20px', display: 'flex', gap: 10 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Digite uma mensagem..."
          style={{ flex: 1, height: 44, borderRadius: 22, padding: '0 16px', fontSize: 14, border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--gray-900)' }}
        />
        <button type="submit" disabled={!text.trim() || sending} className="btn-primary" style={{ width: 44, height: 44, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: text.trim() && !sending ? 1 : 0.5 }}>
          {sending ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
        </button>
      </form>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

