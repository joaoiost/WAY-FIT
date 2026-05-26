import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore
import webpush from 'npm:web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { student_ids, title, message, personal_id, url } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Persist in-app notifications
    await supabase.from('student_notifications').insert(
      student_ids.map((sid: string) => ({
        student_id: sid,
        personal_id,
        title,
        message,
        type: 'custom',
      }))
    );

    // Fetch push subscriptions
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('student_id, subscription')
      .in('student_id', student_ids);

    if (!subs?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'no_subscriptions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send push via VAPID
    webpush.setVapidDetails(
      'mailto:contato@wayfit.com',
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!
    );

    const payload = JSON.stringify({
      title,
      message,
      tag: 'wayfit-personal',
      url: url || '/aluno/dashboard',
    });

    const results = await Promise.allSettled(
      subs.map(s => webpush.sendNotification(s.subscription, payload))
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;

    // Remove stale subscriptions (410 Gone)
    const stale = results
      .map((r, i) => (r.status === 'rejected' && (r as any).reason?.statusCode === 410 ? subs[i].student_id : null))
      .filter(Boolean);
    if (stale.length) {
      await supabase.from('push_subscriptions').delete().in('student_id', stale);
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
