import { useState, useEffect } from 'react';
import { Settings, Palette, Bell, User, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const PRESET_COLORS = [
  { label: 'Índigo', value: '#818CF8' },
  { label: 'Azul',   value: '#3B82F6' },
  { label: 'Verde',  value: '#10B981' },
  { label: 'Âmbar',  value: '#F59E0B' },
  { label: 'Vermelho', value: '#EF4444' },
  { label: 'Rosa',   value: '#EC4899' },
  { label: 'Violeta', value: '#8B5CF6' },
  { label: 'Ciano',  value: '#06B6D4' },
];

export default function Configuracoes() {
  const { user } = useAuth();
  const [form, setForm] = useState({ brandName: '', tagline: '', logoUrl: '', accentColor: '#818CF8' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!user || !hasSupabase) { setLoading(false); return; }
    supabase.from('personal_settings').select('*').eq('personal_id', user.id).single().then(({ data }) => {
      if (data) {
        setForm({ brandName: data.brand_name || '', tagline: data.tagline || '', logoUrl: data.logo_url || '', accentColor: data.accent_color || '#818CF8' });
        if (data.accent_color) document.documentElement.style.setProperty('--accent', data.accent_color);
      }
      setLoading(false);
    });
  }, [user?.id]);

  function applyColor(color) {
    setForm(p => ({ ...p, accentColor: color }));
    document.documentElement.style.setProperty('--accent', color);
  }

  async function handleSave() {
    setSaving(true);
    await supabase.from('personal_settings').upsert({
      personal_id: user.id,
      brand_name: form.brandName,
      tagline: form.tagline,
      logo_url: form.logoUrl,
      accent_color: form.accentColor,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'personal_id' });
    setSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const cardStyle = { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 14 };
  const labelStyle = { fontSize: 12, fontWeight: 700, color: 'var(--gray-400)', marginBottom: 6, display: 'block' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--gray-900)', fontSize: 14, boxSizing: 'border-box', outline: 'none' };

  return (
    <div className="page-padding" style={{ paddingBottom: 100 }}>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h2 className="page-title">Configurações</h2>
          <p className="page-subtitle">Personalize seu app</p>
        </div>
        <Settings size={24} color="var(--accent)" />
      </div>

      {showSuccess && (
        <div style={{ background: 'rgba(63,185,80,0.12)', border: '1px solid rgba(63,185,80,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Check size={16} color="var(--green)" />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>Configurações salvas!</span>
        </div>
      )}

      {/* Marca */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <User size={16} color="var(--accent)" />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--gray-900)' }}>Perfil & Marca</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Nome da marca</label>
            <input value={form.brandName} onChange={e => setForm(p => ({ ...p, brandName: e.target.value }))} placeholder="Ex: João Silva Personal" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Tagline</label>
            <input value={form.tagline} onChange={e => setForm(p => ({ ...p, tagline: e.target.value }))} placeholder="Ex: Transformando corpos, mudando vidas" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>URL do logo (imagem)</label>
            <input value={form.logoUrl} onChange={e => setForm(p => ({ ...p, logoUrl: e.target.value }))} placeholder="https://..." style={inputStyle} />
          </div>

          {/* Preview */}
          {(form.brandName || form.logoUrl) && (
            <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
              <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase' }}>Pré-visualização (dashboard do aluno)</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="logo" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: form.accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: 'white' }}>
                    {(form.brandName || 'W').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--gray-900)' }}>{form.brandName || 'Sua Marca'}</p>
                  {form.tagline && <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)' }}>{form.tagline}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cor */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Palette size={16} color="var(--accent)" />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--gray-900)' }}>Cor de Destaque</h3>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--gray-400)' }}>Esta cor é aplicada em todo o app dos seus alunos</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
          {PRESET_COLORS.map(c => (
            <button key={c.value} onClick={() => applyColor(c.value)} title={c.label}
              style={{ width: '100%', aspectRatio: '1', borderRadius: 10, background: c.value, border: form.accentColor === c.value ? '3px solid white' : '2px solid transparent', cursor: 'pointer', boxShadow: form.accentColor === c.value ? `0 0 0 2px ${c.value}` : 'none', transition: 'all 0.15s' }}>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ ...labelStyle, margin: 0, flexShrink: 0 }}>Cor personalizada</label>
          <input type="color" value={form.accentColor} onChange={e => applyColor(e.target.value)}
            style={{ width: 40, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-page)', cursor: 'pointer', padding: 2 }} />
          <span style={{ fontSize: 13, color: 'var(--gray-400)', fontFamily: 'monospace' }}>{form.accentColor}</span>
        </div>
      </div>

      {/* Notificações (em breve) */}
      <div style={{ ...cardStyle, opacity: 0.7 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Bell size={16} color="var(--gray-400)" />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--gray-900)' }}>Notificações</h3>
          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: 'var(--yellow)', background: 'rgba(210,153,34,0.15)', padding: '2px 8px', borderRadius: 20 }}>Em breve</span>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--gray-400)' }}>Configure lembretes automáticos para seus alunos</p>
        {[['Lembrete de inatividade (7 dias)', true], ['Aviso de pagamento atrasado', true]].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--gray-900)' }}>{l}</span>
            <div style={{ width: 40, height: 22, borderRadius: 11, background: v ? 'var(--accent)' : 'var(--border)', position: 'relative', opacity: 0.5 }}>
              <div style={{ position: 'absolute', top: 2, left: v ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Conta */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <User size={16} color="var(--accent)" />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--gray-900)' }}>Conta</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[['E-mail', user?.email || ''], ['Plano', 'WAY FIT Pro']].map(([l, v]) => (
            <div key={l}>
              <label style={labelStyle}>{l}</label>
              <div style={{ ...inputStyle, color: 'var(--gray-400)', cursor: 'not-allowed' }}>{v}</div>
            </div>
          ))}
          <button onClick={() => setResetSent(true)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
            {resetSent ? '✓ E-mail enviado!' : 'Alterar senha'}
          </button>
        </div>
      </div>

      {/* Save button */}
      <div style={{ position: 'sticky', bottom: 80, zIndex: 10 }}>
        <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ width: '100%', padding: '15px 0', fontSize: 15, fontWeight: 800, boxShadow: '0 8px 28px rgba(129,140,248,0.35)' }}>
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
}
