import { useState, useRef } from 'react';
import { Camera, Save, Copy, Check, User, Link2, Phone, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Perfil() {
  const { user, updateProfile, uploadAvatar, hasSupabase } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', bio: user?.bio || '', phone: user?.phone || '', slug: user?.slug || '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || null);
  const fileRef = useRef();

  const profileUrl = `${window.location.origin}/p/${form.slug || user?.slug || ''}`;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Foto deve ter no máximo 5MB'); return; }
    setAvatarPreview(URL.createObjectURL(file));
    setUploading(true);
    setError('');
    const result = await uploadAvatar(file);
    setUploading(false);
    if (!result.success) setError(result.error || 'Erro ao enviar foto');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Nome é obrigatório'); return; }
    if (!form.slug.trim()) { setError('Link é obrigatório'); return; }
    if (!/^[a-z0-9]+$/.test(form.slug)) { setError('Link só pode ter letras minúsculas e números, sem espaços'); return; }
    setSaving(true);
    setError('');
    const result = await updateProfile(form);
    setSaving(false);
    if (result.success) { setSuccess(true); setTimeout(() => setSuccess(false), 3000); }
    else setError(result.error || 'Erro ao salvar');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const avatarLetter = (user?.name || 'W').slice(0, 2).toUpperCase();

  return (
    <div className="page-padding" style={{ flex: 1, maxWidth: 860, margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>Meu Perfil</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6B7280' }}>Gerencie suas informações e seu link público</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left: photo card */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 96, height: 96, borderRadius: '50%', overflow: 'hidden',
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
            }}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 28, fontWeight: 800, color: 'white' }}>{avatarLetter}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 30, height: 30, borderRadius: '50%',
                background: uploading ? '#9CA3AF' : '#3B82F6',
                border: '2px solid white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: uploading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}
            >
              <Camera size={13} color="white" />
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} style={{ display: 'none' }} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>{user?.name}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>{user?.email}</p>
            <span style={{ display: 'inline-block', marginTop: 8, background: '#EFF6FF', color: '#3B82F6', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
              Personal Trainer
            </span>
          </div>

          {uploading && (
            <p style={{ fontSize: 12, color: '#3B82F6', margin: 0 }}>Enviando foto...</p>
          )}
          {!hasSupabase && (
            <p style={{ fontSize: 11, color: '#92400E', background: '#FEF3C7', padding: '6px 10px', borderRadius: 8, margin: 0, textAlign: 'center', lineHeight: 1.4 }}>
              Modo demo: foto não é salva sem Supabase
            </p>
          )}
        </div>

        {/* Right: form */}
        <div style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {error && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#DC2626' }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}
          {success && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#D1FAE5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#065F46' }}>
              <CheckCircle size={15} /> Perfil salvo com sucesso!
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                <User size={14} /> Nome completo *
              </label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Seu nome completo" required />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                <Phone size={14} /> WhatsApp / Telefone
              </label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                <FileText size={14} /> Bio / Apresentação
              </label>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Ex: Personal trainer especializado em hipertrofia e emagrecimento. +5 anos de experiência."
                rows={3}
                style={{ resize: 'vertical', fontSize: 14 }}
              />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                <Link2 size={14} /> Meu link exclusivo *
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
                <span style={{ padding: '0 12px', fontSize: 13, color: '#9CA3AF', borderRight: '1px solid #E5E7EB', height: 40, display: 'flex', alignItems: 'center', background: '#F3F4F6', whiteSpace: 'nowrap' }}>
                  {window.location.origin}/p/
                </span>
                <input
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') }))}
                  placeholder="seulink"
                  style={{ border: 'none', background: 'transparent', flex: 1, padding: '0 12px', fontSize: 14, height: 40 }}
                  required
                />
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9CA3AF' }}>Só letras minúsculas e números. Este é o link que você compartilha com potenciais alunos.</p>
            </div>

            <button type="submit" className="btn-primary" style={{ justifyContent: 'center', padding: '12px', opacity: saving ? 0.7 : 1 }} disabled={saving}>
              <Save size={15} /> {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </form>
        </div>
      </div>

      {/* Share link section */}
      <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginTop: 20 }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#111827' }}>Seu link de captação</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6B7280' }}>
          Compartilhe este link com potenciais alunos. Eles verão seu perfil e poderão solicitar uma avaliação.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 8, padding: '11px 14px', fontSize: 14, color: '#065F46', fontWeight: 600, wordBreak: 'break-all' }}>
            {profileUrl}
          </div>
          <button
            onClick={copyLink}
            style={{ padding: '11px 18px', background: copied ? '#10B981' : '#3B82F6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, flexShrink: 0, transition: 'background 0.2s' }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <a href={`/p/${form.slug || user?.slug}`} target="_blank" rel="noreferrer"
            style={{ padding: '11px 18px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
            Visualizar
          </a>
        </div>
      </div>
    </div>
  );
}
