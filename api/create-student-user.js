// Cria usuário no Supabase SEM exigir confirmação de email.
// Requer SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente do Vercel.
// Obtenha em: Supabase dashboard → Settings → API → service_role key
//
// Suporta troca de personal: se aluno já tem conta, vincula o novo personal
// sem criar usuário duplicado.

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
    const patchHeaders = { ...adminHeaders, 'Prefer': 'return=minimal' };

    // Busca dados do convite primeiro (precisa para os dois caminhos)
    let invite = null;
    if (inviteToken) {
      const invResp = await fetch(
        `${SUPABASE_URL}/rest/v1/invites?token=eq.${encodeURIComponent(inviteToken)}&select=*`,
        { headers: adminHeaders }
      );
      const invites = await invResp.json();
      invite = Array.isArray(invites) ? invites[0] : null;
    }

    // Tenta criar usuário via Admin API — email_confirm: true bypassa confirmação de email
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

    // Aluno já tem conta — troca de personal ou re-invite
    if (!createResp.ok) {
      const msg = (userData.msg || userData.message || userData.error || '').toLowerCase();
      const isAlreadyRegistered = msg.includes('already') || msg.includes('registered') || msg.includes('exists');

      if (!isAlreadyRegistered) {
        return res.status(400).json({ ok: false, error: userData.msg || userData.message || userData.error || JSON.stringify(userData) });
      }

      // Busca user_id existente via tabela students (service role bypassa RLS)
      const existingResp = await fetch(
        `${SUPABASE_URL}/rest/v1/students?email=eq.${encodeURIComponent(email)}&user_id=not.is.null&select=user_id&limit=1`,
        { headers: adminHeaders }
      );
      const existingRows = await existingResp.json();
      const existingUserId = Array.isArray(existingRows) ? existingRows[0]?.user_id : null;

      if (!existingUserId) {
        return res.status(400).json({ ok: false, error: 'Email já cadastrado. Faça login na área do aluno.' });
      }

      if (invite) {
        // Vincula o row do novo personal ao user_id existente
        await fetch(
          `${SUPABASE_URL}/rest/v1/students?personal_id=eq.${invite.personal_id}&email=eq.${encodeURIComponent(invite.email)}&user_id=is.null`,
          { method: 'PATCH', headers: patchHeaders, body: JSON.stringify({ user_id: existingUserId }) }
        );
        // Marca convite como usado
        await fetch(`${SUPABASE_URL}/rest/v1/invites?token=eq.${encodeURIComponent(inviteToken)}`, {
          method: 'PATCH', headers: patchHeaders, body: JSON.stringify({ used: true }),
        });
      }

      return res.status(200).json({ ok: true, userId: existingUserId, switched: true });
    }

    // Novo usuário criado com sucesso
    const userId = userData.id;

    if (invite) {
      // Marca convite como usado
      await fetch(`${SUPABASE_URL}/rest/v1/invites?token=eq.${encodeURIComponent(inviteToken)}`, {
        method: 'PATCH',
        headers: patchHeaders,
        body: JSON.stringify({ used: true }),
      });

      // Vincula o aluno ao user_id criado
      await fetch(
        `${SUPABASE_URL}/rest/v1/students?personal_id=eq.${invite.personal_id}&email=eq.${encodeURIComponent(invite.email)}`,
        { method: 'PATCH', headers: patchHeaders, body: JSON.stringify({ user_id: userId }) }
      );
    }

    return res.status(200).json({ ok: true, userId });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
