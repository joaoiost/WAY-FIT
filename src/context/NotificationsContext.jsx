import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase, hasSupabase } from '../lib/supabase';

const NotificationsContext = createContext();

const TYPE_ICONS = { message: '💬', workout: '💪', payment: '💰', appointment: '📅', custom: '🔔', absence: '⚠️', student: '👤', water: '💧', achievement: '🔥', progress: '📊' };

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Agora';
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  return d.toLocaleDateString('pt-BR');
}

const STUDENT_NOTIFS_STATIC = [
  { id: 'sw1', icon: '💪', title: 'Treino disponível', message: 'Seu treino de hoje está pronto! Bora treinar!', time: 'Hoje', read: false, type: 'workout' },
  { id: 'sw2', icon: '🔥', title: 'Continue assim!', message: 'Registre seu progresso regularmente para acompanhar sua evolução.', time: 'Hoje', read: true, type: 'achievement' },
];

async function loadPersonalNotifications(userId) {
  const notifs = [];
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // 1. Upcoming appointments in next 60 min
  const now = new Date();
  const in60 = new Date(now.getTime() + 60 * 60 * 1000);
  const nowTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const in60Time = `${String(in60.getHours()).padStart(2,'0')}:${String(in60.getMinutes()).padStart(2,'0')}`;

  const { data: upcoming } = await supabase
    .from('appointments')
    .select('student_name, time, type')
    .eq('personal_id', userId)
    .eq('date', today)
    .eq('status', 'pending')
    .gte('time', nowTime)
    .lte('time', in60Time)
    .order('time')
    .limit(3);

  (upcoming || []).forEach((a, i) => {
    notifs.push({
      id: `upcoming-${i}`,
      icon: '📅',
      title: 'Aula em breve',
      message: `${a.student_name} — ${a.type} às ${a.time.slice(0,5)}`,
      time: 'Hoje',
      read: false,
      type: 'appointment',
    });
  });

  // 2. Students with pending/overdue payments
  const { data: latePay } = await supabase
    .from('payments')
    .select('student_name, due_date, amount')
    .eq('personal_id', userId)
    .eq('status', 'pendente')
    .lte('due_date', today)
    .order('due_date')
    .limit(5);

  (latePay || []).forEach((p, i) => {
    const daysLate = Math.floor((Date.now() - new Date(p.due_date).getTime()) / 86400000);
    notifs.push({
      id: `pay-${i}`,
      icon: '💰',
      title: 'Pagamento pendente',
      message: `${p.student_name} — R$ ${Number(p.amount).toLocaleString('pt-BR')} (${daysLate}d atraso)`,
      time: new Date(p.due_date).toLocaleDateString('pt-BR'),
      read: false,
      type: 'payment',
    });
  });

  // 3. Students who haven't attended in 7 days
  const { data: students } = await supabase
    .from('students')
    .select('id, name')
    .eq('personal_id', userId)
    .eq('status', 'ativo');

  if (students?.length) {
    const { data: recentAtts } = await supabase
      .from('attendances')
      .select('student_id')
      .eq('personal_id', userId)
      .eq('status', 'present')
      .gte('date', sevenDaysAgo);

    const recentIds = new Set((recentAtts || []).map(a => String(a.student_id)));
    const inactive = (students || []).filter(s => !recentIds.has(String(s.id)));

    inactive.slice(0, 3).forEach((s, i) => {
      notifs.push({
        id: `absent-${i}`,
        icon: '⚠️',
        title: 'Aluno sem treinar',
        message: `${s.name} não treina há mais de 7 dias`,
        time: 'Esta semana',
        read: true,
        type: 'absence',
      });
    });
  }

  // 4. Recent invite acceptances
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: invites } = await supabase
    .from('invites')
    .select('*')
    .eq('personal_id', userId)
    .eq('used', true)
    .gte('created_at', since);

  (invites || []).forEach(inv => {
    notifs.push({
      id: `invite-${inv.id}`,
      icon: '👤',
      title: 'Novo aluno entrou!',
      message: `${inv.student_name || inv.email} aceitou seu convite`,
      time: new Date(inv.created_at).toLocaleDateString('pt-BR'),
      read: false,
      type: 'student',
    });
  });

  return notifs;
}

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [waterToast, setWaterToast] = useState(false);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    if (user.role === 'personal') {
      if (hasSupabase) {
        loadPersonalNotifications(user.id).then(notifs => setNotifications(notifs));
      } else {
        // Offline fallback — no fake names
        setNotifications([
          { id: 'off1', icon: '📅', title: 'Sem conexão', message: 'Notificações carregam quando online', time: 'Agora', read: false, type: 'appointment' },
        ]);
      }
      return;
    }

    // Student: static base + real notifications from DB
    setNotifications([...STUDENT_NOTIFS_STATIC]);

    if (hasSupabase && user.studentId) {
      const studentId = user.studentId;
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      supabase
        .from('student_notifications')
        .select('*')
        .eq('student_id', studentId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (!data?.length) return;
          const realNotifs = data.map(n => ({
            id: `sn-${n.id}`,
            icon: TYPE_ICONS[n.type] || '🔔',
            title: n.title,
            message: n.message,
            time: formatTime(n.created_at),
            read: n.read,
            type: n.type,
            dbId: n.id,
          }));
          setNotifications(prev => [...realNotifs, ...prev.filter(p => !p.id.startsWith('sn-'))]);
        });

      // Realtime for new student notifications
      const channel = supabase
        .channel(`student_notifs_${studentId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'student_notifications',
          filter: `student_id=eq.${studentId}`,
        }, ({ new: n }) => {
          setNotifications(prev => [{
            id: `sn-${n.id}`,
            icon: TYPE_ICONS[n.type] || '🔔',
            title: n.title,
            message: n.message,
            time: 'Agora',
            read: false,
            type: n.type,
            dbId: n.id,
          }, ...prev]);
        })
        .subscribe();

      channelRef.current = channel;
      return () => { supabase.removeChannel(channel); channelRef.current = null; };
    }
  }, [user?.id]);

  // Water reminder every 30 min for students
  useEffect(() => {
    if (!user || user.role !== 'student') return;
    const t = setInterval(() => {
      setWaterToast(true);
      setNotifications(prev => [{
        id: Date.now(), icon: '💧', title: 'Hora de beber água!',
        message: 'Beba um copo de água agora. Hidratação é fundamental! 💧',
        time: 'Agora', read: false, type: 'water',
      }, ...prev]);
    }, 30 * 60 * 1000);
    return () => clearInterval(t);
  }, [user?.id]);

  const markRead = (id) => {
    setNotifications(p => p.map(n => {
      if (n.id !== id) return n;
      if (n.dbId && hasSupabase) supabase.from('student_notifications').update({ read: true }).eq('id', n.dbId).then(() => {});
      return { ...n, read: true };
    }));
  };
  const markAllRead = () => setNotifications(p => p.map(n => ({ ...n, read: true })));
  const addNotification = (n) => setNotifications(p => [{ ...n, id: Date.now(), time: 'Agora', read: false }, ...p]);
  const dismissWater = () => setWaterToast(false);

  const unread = notifications.filter(n => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unread, markRead, markAllRead, addNotification, waterToast, dismissWater }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);
