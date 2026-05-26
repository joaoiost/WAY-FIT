import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase, hasSupabase } from '../lib/supabase';

const NotificationsContext = createContext();

const PERSONAL_NOTIFS = [
  { id: 1, icon: '💰', title: 'Pagamento atrasado', message: 'Rafael Costa está com pagamento atrasado há 5 dias', time: '2h atrás', read: false, type: 'payment' },
  { id: 2, icon: '⚠️', title: 'Aluno sem treinar', message: 'Pedro Alves não treina há 7 dias', time: '3h atrás', read: false, type: 'absence' },
  { id: 3, icon: '📅', title: 'Aula em 30 minutos', message: 'Aula com Ana Beatriz às 10:30', time: '30min atrás', read: false, type: 'appointment' },
  { id: 4, icon: '💰', title: 'Pagamentos vencendo', message: '3 alunos com pagamento vencendo esta semana', time: 'Hoje', read: true, type: 'payment' },
  { id: 5, icon: '👤', title: 'Novo aluno', message: 'Marina Silva completou o cadastro', time: 'Ontem', read: true, type: 'student' },
];

const STUDENT_NOTIFS = [
  { id: 1, icon: '💪', title: 'Treino disponível', message: 'Seu treino de hoje está pronto! Bora treinar!', time: 'Hoje', read: false, type: 'workout' },
  { id: 2, icon: '📅', title: 'Aula amanhã', message: 'Lembrete: aula amanhã às 09:00 com João Silva', time: '1h atrás', read: false, type: 'appointment' },
  { id: 3, icon: '💧', title: 'Beba água!', message: 'Você está hidratado hoje? Lembre-se de beber pelo menos 2L de água.', time: '2h atrás', read: false, type: 'water' },
  { id: 4, icon: '🔥', title: 'Sequência incrível!', message: '5 dias de treino consecutivos. Continue assim!', time: 'Hoje', read: true, type: 'achievement' },
  { id: 5, icon: '💬', title: 'Mensagem do personal', message: 'João Silva enviou uma mensagem para você', time: 'Ontem', read: true, type: 'message' },
  { id: 6, icon: '📊', title: 'Registre seu progresso', message: 'Já faz 15 dias desde sua última medição. Registre seu peso!', time: 'Ontem', read: true, type: 'progress' },
];

const TYPE_ICONS = { message: '💬', workout: '💪', payment: '💰', appointment: '📅', custom: '🔔' };

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

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [waterToast, setWaterToast] = useState(false);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const base = user.role === 'personal' ? [...PERSONAL_NOTIFS] : [...STUDENT_NOTIFS];
    setNotifications(base);

    // Busca convites usados recentemente para notificar o personal
    if (user.role === 'personal' && hasSupabase) {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      supabase
        .from('invites')
        .select('*')
        .eq('personal_id', user.id)
        .eq('used', true)
        .gte('created_at', since)
        .then(({ data }) => {
          if (!data?.length) return;
          const newNotifs = data.map(inv => ({
            id: `invite-${inv.id}`,
            icon: '👤',
            title: 'Novo aluno entrou!',
            message: `${inv.student_name || inv.email} aceitou seu convite e criou a conta.`,
            time: new Date(inv.created_at).toLocaleDateString('pt-BR'),
            read: false,
            type: 'student',
          }));
          setNotifications(prev => [...newNotifs, ...prev]);
        });
    }

    // Aluno: carrega notificações reais do personal + assina realtime
    if (user.role === 'student' && hasSupabase && user.studentId) {
      const studentId = user.studentId;

      // Carrega histórico recente (últimos 30 dias)
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
          setNotifications(prev => [...realNotifs, ...prev]);
        });

      // Assina realtime para novas notificações
      const channel = supabase
        .channel(`student_notifs_${studentId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'student_notifications',
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
        message: 'Beba um copo de água agora. Hidratação é fundamental para o treino! 💧',
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
