import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, hasSupabase } from '../lib/supabase';

const AuthContext = createContext(null);

const MOCK_USERS = [
  { id: 1, name: 'João Silva', email: 'personal@wayfit.com', password: '123456', role: 'personal', avatar: 'JS', slug: 'joaosilva' },
  { id: 2, name: 'Lucas Mendes', email: 'aluno@wayfit.com', password: '123456', role: 'student', avatar: 'LM', studentId: 1 },
];

function nameToSlug(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '').slice(0, 24);
}

async function generateUniqueSlug(userId, name) {
  const base = nameToSlug(name);
  let slug = base;
  let i = 2;
  while (true) {
    const { data } = await supabase.from('profiles').select('id').eq('slug', slug).neq('id', userId).maybeSingle();
    if (!data) break;
    slug = `${base}${i++}`;
  }
  return slug;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasSupabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) loadProfile(session.user);
        else setLoading(false);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
        if (session) loadProfile(session.user);
        else { setUser(null); setLoading(false); }
      });
      return () => subscription.unsubscribe();
    } else {
      const stored = localStorage.getItem('wayfit_user');
      if (stored) { try { setUser(JSON.parse(stored)); } catch { localStorage.removeItem('wayfit_user'); } }
      setLoading(false);
    }
  }, []);

  async function loadProfile(authUser) {
    let { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();

    if (!profile) {
      const meta = authUser.user_metadata || {};
      const name = meta.name || authUser.email.split('@')[0];
      const role = meta.role || 'personal';
      const avatar = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
      const phone = meta.phone || null;
      const { data } = await supabase.from('profiles').insert({ id: authUser.id, name, role, avatar, phone }).select().single();
      profile = data;
    }

    if (profile && !profile.slug) {
      const slug = await generateUniqueSlug(authUser.id, profile.name);
      await supabase.from('profiles').update({ slug }).eq('id', authUser.id);
      profile = { ...profile, slug };
    }

    if (profile) {
      setUser({
        id: authUser.id,
        name: profile.name,
        email: authUser.email,
        role: profile.role,
        avatar: profile.avatar,
        avatarUrl: profile.avatar_url || null,
        slug: profile.slug,
        bio: profile.bio || '',
        phone: profile.phone || '',
      });
    }
    setLoading(false);
  }

  const login = async (email, password) => {
    if (hasSupabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: 'Email ou senha incorretos' };
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      if (!profile) return { success: false, error: 'Perfil não encontrado' };
      return { success: true, role: profile.role };
    }
    const found = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (!found) return { success: false, error: 'Email ou senha incorretos' };
    const u = { id: found.id, studentId: found.studentId, name: found.name, email: found.email, role: found.role, avatar: found.avatar, slug: found.slug };
    setUser(u);
    localStorage.setItem('wayfit_user', JSON.stringify(u));
    return { success: true, role: u.role };
  };

  const register = async ({ name, email, password, role = 'personal', inviteToken, phone }) => {
    if (hasSupabase) {
      if (role === 'student' && inviteToken) {
        const { data: invite } = await supabase.from('invites').select('*').eq('token', inviteToken).eq('used', false).single();
        if (!invite) return { success: false, error: 'Convite inválido ou já utilizado' };
      }
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, role, phone: phone || null } } });
      if (error) return { success: false, error: error.message };
      if (inviteToken && data.user) {
        const { data: invite } = await supabase.from('invites').select('*').eq('token', inviteToken).single();
        if (invite) {
          await supabase.from('invites').update({ used: true }).eq('token', inviteToken);
          await supabase.from('students').update({ user_id: data.user.id }).eq('personal_id', invite.personal_id).eq('email', invite.email);
        }
      }
      return { success: true, needsEmailConfirmation: !data.session, userId: data.user?.id };
    }
    return { success: true, needsEmailConfirmation: false, userId: null };
  };

  const updateProfile = async ({ name, bio, phone, slug }) => {
    if (!user) return { success: false };
    if (hasSupabase) {
      const avatar = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
      const { error } = await supabase.from('profiles').update({ name, bio, phone, slug, avatar }).eq('id', user.id);
      if (error) return { success: false, error: error.message };
      setUser(prev => ({ ...prev, name, bio, phone, slug, avatar }));
      return { success: true };
    }
    setUser(prev => ({ ...prev, name, bio, phone, slug }));
    return { success: true };
  };

  const uploadAvatar = async (file) => {
    if (!hasSupabase || !user) return { success: false, error: 'Supabase não configurado' };
    const ext = file.name.split('.').pop().toLowerCase();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
    if (error) return { success: false, error: error.message };
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;
    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
    setUser(prev => ({ ...prev, avatarUrl: url }));
    return { success: true, url };
  };

  const forgotPassword = async (email) => {
    if (hasSupabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/recuperar-senha` });
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
    return { success: true };
  };

  const resetPassword = async (newPassword) => {
    if (hasSupabase) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
    return { success: true };
  };

  const logout = async () => {
    if (hasSupabase) await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('wayfit_user');
  };

  const sendInvite = async ({ email, studentName }) => {
    if (hasSupabase) {
      const token = crypto.randomUUID();
      const { error } = await supabase.from('invites').insert({
        personal_id: user.id, personal_name: user.name,
        email, student_name: studentName, token,
      });
      if (error) return { success: false, error: error.message };
      const inviteUrl = `${window.location.origin}/convite?invite=${token}`;
      return { success: true, inviteUrl, token };
    }
    const token = Math.random().toString(36).slice(2, 10).toUpperCase();
    const invites = JSON.parse(localStorage.getItem('wayfit_invites') || '[]');
    invites.push({ token, email, student_name: studentName, personalId: user?.id, used: false, createdAt: new Date().toISOString() });
    localStorage.setItem('wayfit_invites', JSON.stringify(invites));
    return { success: true, inviteUrl: `${window.location.origin}/convite?invite=${token}`, token };
  };

  const validateInvite = async (token) => {
    if (hasSupabase) {
      const { data } = await supabase.from('invites').select('*').eq('token', token).eq('used', false).single();
      return data || null;
    }
    const invites = JSON.parse(localStorage.getItem('wayfit_invites') || '[]');
    return invites.find(i => i.token === token && !i.used) || null;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, updateProfile, uploadAvatar, forgotPassword, resetPassword, sendInvite, validateInvite, hasSupabase }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
