import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore
import webpush from 'npm:web-push';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Current time in BRT (UTC-3)
  const nowUtc = new Date();
  const brtNow = new Date(nowUtc.getTime() - 3 * 3600000);
  const todayBRT = brtNow.toISOString().slice(0, 10);
  const dayOfWeek = brtNow.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const brtMinutes = brtNow.getHours() * 60 + brtNow.getMinutes();

  // Fetch all active schedules not yet sent today
  const { data: schedules, error } = await supabase
    .from('scheduled_notifications')
    .select('*')
    .eq('is_active', true)
    .or(`last_sent_date.is.null,last_sent_date.lt.${todayBRT}`);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!schedules?.length) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Filter: must be today's day and scheduled time already passed
  const due = schedules.filter(s => {
    if (!s.days_of_week?.includes(dayOfWeek)) return false;
    const scheduledMinutes = (s.send_hour ?? 8) * 60 + (s.send_minute ?? 0);
    return brtMinutes >= scheduledMinutes;
  });

  if (!due.length) {
    return new Response(JSON.stringify({ ok: true, processed: 0, checked: schedules.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  webpush.setVapidDetails(
    'mailto:contato@wayfit.com',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!
  );

  let totalPushed = 0;

  for (const schedule of due) {
    // Resolve student IDs
    let studentIds: string[] = (schedule.student_ids ?? []).map(String);
    if (!studentIds.length) {
      const { data: stds } = await supabase
        .from('students')
        .select('id')
        .eq('personal_id', schedule.personal_id)
        .eq('status', 'ativo');
      studentIds = (stds ?? []).map((s: any) => String(s.id));
    }

    if (!studentIds.length) continue;

    // Save in-app notifications
    await supabase.from('student_notifications').insert(
      studentIds.map(sid => ({
        student_id: sid,
        personal_id: schedule.personal_id,
        title: schedule.title,
        message: schedule.message,
        type: 'scheduled',
      }))
    );

    // Send push to subscribed students
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('student_id, subscription')
      .in('student_id', studentIds);

    if (subs?.length) {
      const payload = JSON.stringify({
        title: schedule.title,
        message: schedule.message,
        tag: `sched-${schedule.id}`,
        url: '/aluno/dashboard',
      });

      const results = await Promise.allSettled(
        subs.map((s: any) => webpush.sendNotification(s.subscription, payload))
      );

      totalPushed += results.filter(r => r.status === 'fulfilled').length;

      // Remove expired subscriptions
      const stale = results
        .map((r, i) => (r.status === 'rejected' && (r as any).reason?.statusCode === 410 ? subs[i].student_id : null))
        .filter(Boolean);
      if (stale.length) {
        await supabase.from('push_subscriptions').delete().in('student_id', stale);
      }
    }

    // Mark as sent today
    await supabase
      .from('scheduled_notifications')
      .update({ last_sent_date: todayBRT })
      .eq('id', schedule.id);
  }

  return new Response(
    JSON.stringify({ ok: true, processed: due.length, pushed: totalPushed, date: todayBRT }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
