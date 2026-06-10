// Cria usuário no Supabase SEM exigir confirmação de email.
// Requer SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente do Vercel.
// Obtenha em: Supabase dashboard → Settings → API → service_role key

const SUPABASE_URL = 'https://mpgfigjvsuddqvfxcmmp.supabase.co';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const { email, password, name, inviteToken } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ ok: false, error: 'email, password e name são obrigatórios' });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return res.status(500).json({
        ok: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY não configurada. Adicione nas variáveis de ambiente do Vercel.',
      });
    }

    const adminHeaders = {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
    };

    // Cria usuário via Admin API — email_confirm: true bypassa confirmação de email
    const createResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: 'student' },
      }),
    });

    const userData = await createResp.json();
    if (!createResp.ok) {
      const msg = userData.msg || userData.message || userData.error || JSON.stringify(userData);
      return res.status(400).json({ ok: false, error: msg });
    }

    const userId = userData.id;

    // Processa token de convite se fornecido
    if (inviteToken) {
      // Busca dados do convite
      const invResp = await fetch(
        `${SUPABASE_URL}/rest/v1/invites?token=eq.${encodeURIComponent(inviteToken)}&select=*`,
        { headers: adminHeaders }
      );
      const invites = await invResp.json();
      const invite = Array.isArray(invites) ? invites[0] : null;

      if (invite) {
        const patchHeaders = { ...adminHeaders, 'Prefer': 'return=minimal' };

        // Marca convite como usado
        await fetch(`${SUPABASE_URL}/rest/v1/invites?token=eq.${encodeURIComponent(inviteToken)}`, {
          method: 'PATCH',
          headers: patchHeaders,
          body: JSON.stringify({ used: true }),
        });

        // Vincula o aluno ao user_id criado
        await fetch(
          `${SUPABASE_URL}/rest/v1/students?personal_id=eq.${invite.personal_id}&email=eq.${encodeURIComponent(invite.email)}`,
          {
            method: 'PATCH',
            headers: patchHeaders,
            body: JSON.stringify({ user_id: userId }),
          }
        );
      }
    }

    return res.status(200).json({ ok: true, userId });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
