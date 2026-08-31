import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, Search, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { todayLocal, toLocalDateStr } from '../../lib/date';

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??';
}
const AVATAR_COLORS = ['#4F46E5', '#059669', '#7C3AED', '#D97706', '#DC2626', '#DB2777', '#0891B2'];
function avatarColor(id) { return AVATAR_COLORS[String(id).charCodeAt(0) % AVATAR_COLORS.length]; }

function DateDivider({ dateStr }) {
  const today = todayLocal();
  const yesterday = toLocalDateStr(new Date(Date.now() - 86400000));
  const label = dateStr === today ? 'Hoje' : dateStr === yesterday ? 'Ontem'
    : new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  return (
    <div className="flex items-center gap-2.5 my-3">
      <div className="flex-1 h-px bg-ink-100" />
      <span className="text-[11px] font-semibold text-ink-400">{label}</span>
      <div className="flex-1 h-px bg-ink-100" />
    </div>
  );
}

export default function ChatV2() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState({});
  const [unreadCount, setUnreadCount] = useState({});
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [search, setSearch] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, selectedId]);

  useEffect(() => {
    if (!user || !hasSupabase) { setLoading(false); return; }
    supabase.from('students').select('id, name, color').eq('personal_id', user.id).order('name')
      .then(({ data, error }) => {
        if (error) { toast.error('Não foi possível carregar as conversas.'); }
        setStudents(data || []);
        setLoading(false);
        if (data?.length) loadLastMessages(data.map(s => s.id));
      });
  }, [user?.id]);

  const loadLastMessages = async (studentIds) => {
    const { data, error } = await supabase.from('messages').select('*').in('student_id', studentIds).order('created_at', { ascending: false }).limit(1000);
    if (error || !data) return;
    const grouped = {};
    const unread = {};
    data.forEach(msg => {
      const sid = String(msg.student_id);
      if (!grouped[sid]) grouped[sid] = [];
      grouped[sid].push(msg);
      if (msg.from_role === 'student' && !msg.read) unread[sid] = (unread[sid] || 0) + 1;
    });
    Object.keys(grouped).forEach(sid => grouped[sid].reverse());
    setMessages(grouped);
    setUnreadCount(unread);
  };

  // Realtime — sem polling paralelo. Se a conexão cair, o próprio cliente
  // Supabase reconecta e reassina o canal sozinho.
  useEffect(() => {
    if (!user || !hasSupabase) return;
    const channel = supabase
      .channel(`chat_personal_${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `personal_id=eq.${user.id}` }, ({ new: msg }) => {
        const sid = String(msg.student_id);
        setMessages(prev => ({ ...prev, [sid]: [...(prev[sid] || []).filter(m => m.id !== msg.id), msg] }));
        setSelectedId(current => {
          if (msg.from_role === 'student' && String(current) !== sid) {
            setUnreadCount(prev => ({ ...prev, [sid]: (prev[sid] || 0) + 1 }));
          }
          return current;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const selectStudent = async (student) => {
    setSelectedId(student.id);
    setUnreadCount(prev => ({ ...prev, [String(student.id)]: 0 }));
    if (!messages[String(student.id)]?.length) {
      setLoadingMsgs(true);
      const { data } = await supabase.from('messages').select('*').eq('student_id', student.id).order('created_at');
      setMessages(prev => ({ ...prev, [String(student.id)]: data || [] }));
      setLoadingMsgs(false);
    }
    supabase.from('messages').update({ read: true }).eq('student_id', student.id).eq('from_role', 'student').then(() => {});
  };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending || !selectedId) return;
    setSending(true);
    const optimistic = { id: `tmp-${Date.now()}`, student_id: selectedId, personal_id: user.id, from_role: 'personal', text: text.trim(), created_at: new Date().toISOString() };
    const sid = String(selectedId);
    setMessages(prev => ({ ...prev, [sid]: [...(prev[sid] || []), optimistic] }));
    setText('');

    const { data, error } = await supabase.from('messages').insert({ student_id: selectedId, personal_id: user.id, from_role: 'personal', text: optimistic.text }).select().single();
    if (data) {
      setMessages(prev => ({ ...prev, [sid]: prev[sid].map(m => m.id === optimistic.id ? data : m) }));
    } else if (error) {
      setMessages(prev => ({ ...prev, [sid]: prev[sid].filter(m => m.id !== optimistic.id) }));
      toast.error('Não foi possível enviar a mensagem.');
    }
    setSending(false);
  };

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const selectedStudent = students.find(s => String(s.id) === String(selectedId));
  const currentMessages = messages[String(selectedId)] || [];

  const grouped = [];
  let lastDate = null;
  currentMessages.forEach(msg => {
    const date = msg.created_at.slice(0, 10);
    if (date !== lastDate) { grouped.push({ type: 'date', date }); lastDate = date; }
    grouped.push({ type: 'msg', msg });
  });

  return (
    <div className="flex gap-4 h-[calc(100vh-104px)]">
      <div className={`w-full sm:w-72 shrink-0 bg-white border border-ink-100 rounded-xl flex-col overflow-hidden ${selectedId ? 'hidden sm:flex' : 'flex'}`}>
        <div className="p-3 border-b border-ink-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar aluno..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-ink-200 text-[13px] text-ink-900 outline-none focus:border-brand-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center"><Loader2 size={18} className="animate-spin text-ink-300 mx-auto" /></div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-6 text-center text-[13px] text-ink-400">{students.length === 0 ? 'Nenhum aluno cadastrado' : 'Nenhum resultado'}</div>
          ) : filteredStudents.map(student => {
            const sid = String(student.id);
            const lastMsg = (messages[sid] || []).slice(-1)[0];
            const unread = unreadCount[sid] || 0;
            const isActive = String(selectedId) === sid;
            return (
              <button
                key={student.id}
                onClick={() => selectStudent(student)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 border-b border-ink-50 last:border-0 text-left transition-colors ${isActive ? 'bg-brand-50' : 'hover:bg-ink-50'}`}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0" style={{ background: student.color || avatarColor(student.id) }}>
                  {getInitials(student.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[13px] truncate ${unread ? 'font-bold text-ink-900' : 'font-semibold text-ink-800'}`}>{student.name.split(' ')[0]}</span>
                    {lastMsg && <span className="text-[10px] text-ink-400 shrink-0">{new Date(lastMsg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>
                  <p className={`text-[12px] truncate ${unread ? 'text-ink-700 font-medium' : 'text-ink-400'}`}>
                    {lastMsg ? (lastMsg.from_role === 'personal' ? `Você: ${lastMsg.text}` : lastMsg.text) : 'Nenhuma mensagem ainda'}
                  </p>
                </div>
                {unread > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{unread}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`flex-1 bg-white border border-ink-100 rounded-xl flex-col overflow-hidden ${selectedId ? 'flex' : 'hidden sm:flex'}`}>
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-ink-400">
            <MessageCircle size={40} className="text-ink-200" />
            <p className="text-[14px] font-semibold text-ink-700">Selecione um aluno</p>
            <p className="text-[12.5px] text-ink-400">Clique em um aluno pra ver a conversa.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-ink-100 shrink-0">
              <button onClick={() => setSelectedId(null)} className="sm:hidden text-ink-500 shrink-0"><ArrowLeft size={19} /></button>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0" style={{ background: selectedStudent?.color || avatarColor(selectedStudent?.id) }}>
                {getInitials(selectedStudent?.name || '')}
              </div>
              <p className="text-[13.5px] font-bold text-ink-900">{selectedStudent?.name}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-ink-50/40 flex flex-col">
              {loadingMsgs ? (
                <Loader2 size={18} className="animate-spin text-ink-300 mx-auto mt-8" />
              ) : grouped.length === 0 ? (
                <div className="text-center mt-8 text-ink-400">
                  <MessageCircle size={28} className="text-ink-200 mx-auto mb-2" />
                  <p className="text-[13px]">Nenhuma mensagem ainda. Diga olá!</p>
                </div>
              ) : grouped.map((item, i) => item.type === 'date' ? (
                <DateDivider key={`d-${i}`} dateStr={item.date} />
              ) : (
                <div key={item.msg.id} className={`flex mb-1.5 ${item.msg.from_role === 'personal' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[72%]">
                    <div className={`px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                      item.msg.from_role === 'personal'
                        ? 'bg-brand-600 text-white rounded-2xl rounded-br-md'
                        : 'bg-white text-ink-900 rounded-2xl rounded-bl-md shadow-sm'
                    }`}>
                      {item.msg.text}
                    </div>
                    <p className={`text-[10px] text-ink-400 mt-1 ${item.msg.from_role === 'personal' ? 'text-right' : 'text-left'}`}>
                      {new Date(item.msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={send} className="flex items-center gap-2 px-4 py-3 border-t border-ink-100 shrink-0">
              <input
                value={text} onChange={(e) => setText(e.target.value)} placeholder="Digite uma mensagem..."
                className="flex-1 px-4 py-2.5 rounded-full border border-ink-200 text-[13.5px] text-ink-900 outline-none focus:border-brand-500"
              />
              <button
                type="submit" disabled={!text.trim() || sending}
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${text.trim() ? 'bg-brand-600 hover:bg-brand-700' : 'bg-ink-100'}`}
              >
                <Send size={16} className={text.trim() ? 'text-white' : 'text-ink-300'} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
