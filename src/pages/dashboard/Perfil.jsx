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
      <div className="page-header">
        <div>
          <h2 className="page-title">Meu Perfil</h2>
          <p className="page-subtitle">Gerencie suas informações e seu link público</p>
        </div>
      </div>

      <div className="perfil-grid" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Left: photo card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 24 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 88, height: 88, borderRadius: '50%', overflow: 'hidden',
              background: 'var(--brand-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
            }}>
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 26, fontWeight: 800, color: 'white' }}>{avatarLetter}</span>
              }
            </div>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: '50%',
                background: uploading ? 'var(--gray-400)' : 'var(--accent)',
                border: '2px solid white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: uploading ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--shadow)',
              }}>
              <Camera size={12} color="white" />
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} style={{ display: 'none' }} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--gray-900)' }}>{user?.name}</p>
            <p style={{ margin: '2px 0 8px', fontSize: 12, color: 'var(--gray-400)' }}>{user?.email}</p>
            <span className="tag tag-accent">Personal Trainer</span>
          </div>

          {uploading && <p style={{ fontSize: 12, color: 'var(--accent)', margin: 0 }}>Enviando foto...</p>}
          {!hasSupabase && (
            <p className="alert alert-warning" style={{ fontSize: 11, margin: 0, textAlign: 'center', lineHeight: 1.4 }}>
              Modo demo: foto não é salva sem Supabase
            </p>
          )}
        </div>

        {/* Right: form */}
        <div className="card" style={{ padding: 24 }}>
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={15} /> {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              <CheckCircle size={15} /> Perfil salvo com sucesso!
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>
                <User size={14} /> Nome completo *
              </label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Seu nome completo" required />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>
                <Phone size={14} /> WhatsApp / Telefone
              </label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" />
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>
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
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>
                <Link2 size={14} /> Meu link exclusivo *
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--gray-50)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <span style={{ padding: '0 12px', fontSize: 12, color: 'var(--gray-400)', borderRight: '1px solid var(--border)', height: 40, display: 'flex', alignItems: 'center', background: 'var(--gray-100)', whiteSpace: 'nowrap' }}>
                  {window.location.origin}/p/
                </span>
                <input
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') }))}
                  placeholder="seulink"
                  style={{ border: 'none', background: 'transparent', flex: 1, padding: '0 12px', fontSize: 14, height: 40, boxShadow: 'none' }}
                  required
                />
              </div>
              <p style={{ margin: '5px 0 0', fontSize: 11, color: 'var(--gray-400)' }}>
                Só letras minúsculas e números. Compartilhe com potenciais alunos.
              </p>
            </div>

            <button type="submit" className="btn-primary" style={{ justifyContent: 'center', padding: '12px', opacity: saving ? 0.7 : 1 }} disabled={saving}>
              <Save size={15} /> {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </form>
        </div>
      </div>

      {/* Share link section */}
      <div className="card" style={{ padding: 24, marginTop: 20 }}>
        <h3 className="section-title" style={{ marginBottom: 4 }}>Seu link de captação</h3>
        <p className="section-desc" style={{ marginBottom: 16 }}>
          Compartilhe com potenciais alunos. Eles verão seu perfil e poderão solicitar uma avaliação.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 'var(--radius-sm)', padding: '11px 14px', fontSize: 13, color: '#065F46', fontWeight: 600, wordBreak: 'break-all' }}>
            {profileUrl}
          </div>
          <button onClick={copyLink}
            style={{ padding: '11px 18px', background: copied ? 'var(--green)' : 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, flexShrink: 0, transition: 'background 0.2s' }}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <a href={`/p/${form.slug || user?.slug}`} target="_blank" rel="noreferrer" className="btn-secondary" style={{ flexShrink: 0 }}>
            Visualizar
          </a>
        </div>
      </div>
    </div>
  );
}
