import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Plus, X, ZoomIn, Calendar, GitCompare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const MOCK_PHOTOS = [
  { id: 1, url: null, label: 'Início do Programa', date: '2026-03-01', weight: '82kg', tag: 'antes' },
  { id: 2, url: null, label: '1 Mês de Treino', date: '2026-04-01', weight: '79kg', tag: 'durante' },
  { id: 3, url: null, label: '2 Meses de Treino', date: '2026-05-01', weight: '77kg', tag: 'durante' },
];

const TAG_COLORS = {
  antes: { bg: '#FEF3C7', color: '#92400E', label: 'Antes' },
  durante: { bg: '#DBEAFE', color: '#1E40AF', label: 'Durante' },
  depois: { bg: '#D1FAE5', color: '#065F46', label: 'Depois' },
};

function PhotoCard({ photo, onView, onDelete }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div
        onClick={() => photo.url && onView(photo)}
        style={{ height: 180, background: photo.url ? `url(${photo.url}) center/cover` : 'linear-gradient(135deg, #F3F4F6, #E5E7EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: photo.url ? 'pointer' : 'default', position: 'relative' }}
      >
        {!photo.url && (
          <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
            <Camera size={36} style={{ marginBottom: 8 }} />
            <p style={{ margin: 0, fontSize: 12 }}>Sem foto</p>
          </div>
        )}
        {photo.url && (
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.3)'; e.currentTarget.style.opacity = 1; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0)'; e.currentTarget.style.opacity = 0; }}
          >
            <ZoomIn size={28} color="white" />
          </div>
        )}
        <button
          onClick={e => { e.stopPropagation(); onDelete(photo.id); }}
          style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
        >
          <X size={13} />
        </button>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{photo.label}</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: TAG_COLORS[photo.tag]?.bg, color: TAG_COLORS[photo.tag]?.color }}>
            {TAG_COLORS[photo.tag]?.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={10} /> {new Date(photo.date + 'T12:00:00').toLocaleDateString('pt-BR')}
          </span>
          {photo.weight && <span style={{ fontSize: 11, color: '#3B82F6', fontWeight: 700 }}>{photo.weight}</span>}
        </div>
      </div>
    </div>
  );
}

function BeforeAfterSlider({ before, after }) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  function updatePos(clientX) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setPosition(pct);
  }

  return (
    <div ref={containerRef}
      onMouseDown={e => { dragging.current = true; updatePos(e.clientX); }}
      onMouseMove={e => dragging.current && updatePos(e.clientX)}
      onMouseUp={() => { dragging.current = false; }}
      onMouseLeave={() => { dragging.current = false; }}
      onTouchStart={e => updatePos(e.touches[0].clientX)}
      onTouchMove={e => { e.preventDefault(); updatePos(e.touches[0].clientX); }}
      style={{ position: 'relative', width: '100%', height: 320, borderRadius: 16, overflow: 'hidden', cursor: 'ew-resize', userSelect: 'none', background: '#1a1a2e' }}>
      {/* Before layer */}
      {before.url ? (
        <img src={before.url} alt="Antes" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>Sem foto</div>
      )}
      {/* After layer (clipped) */}
      <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        {after.url ? (
          <img src={after.url} alt="Depois" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>Sem foto</div>
        )}
      </div>
      {/* Divider */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${position}%`, width: 3, background: 'white', transform: 'translateX(-50%)', pointerEvents: 'none', boxShadow: '0 0 8px rgba(0,0,0,0.4)' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 36, height: 36, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.25)', fontSize: 14, fontWeight: 900, color: '#374151' }}>⇔</div>
      </div>
      {/* Labels */}
      <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, pointerEvents: 'none' }}>ANTES</div>
      <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(129,140,248,0.85)', color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, pointerEvents: 'none' }}>DEPOIS</div>
      {before.date && <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: 10, padding: '2px 8px', borderRadius: 12, pointerEvents: 'none' }}>{new Date(before.date + 'T12:00:00').toLocaleDateString('pt-BR')}</div>}
      {after.date && <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: 10, padding: '2px 8px', borderRadius: 12, pointerEvents: 'none' }}>{new Date(after.date + 'T12:00:00').toLocaleDateString('pt-BR')}</div>}
    </div>
  );
}

function ComparePhoto({ photo }) {
  if (!photo) return (
    <div style={{ flex: 1, borderRadius: 12, background: '#F3F4F6', border: '2px dashed #E5E7EB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, color: '#9CA3AF', gap: 8 }}>
      <Camera size={32} />
      <p style={{ margin: 0, fontSize: 13 }}>Nenhuma foto selecionada</p>
    </div>
  );
  return (
    <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', position: 'relative' }}>
      {photo.url ? (
        <img src={photo.url} alt={photo.label} style={{ width: '100%', objectFit: 'cover', maxHeight: 400, display: 'block' }} />
      ) : (
        <div style={{ height: 280, background: 'linear-gradient(135deg, #F3F4F6, #E5E7EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
          <div style={{ textAlign: 'center' }}>
            <Camera size={40} style={{ marginBottom: 8 }} />
            <p style={{ margin: 0, fontSize: 13 }}>Sem foto</p>
          </div>
        </div>
      )}
      <div style={{ padding: '10px 14px', borderTop: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{photo.label}</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: TAG_COLORS[photo.tag]?.bg, color: TAG_COLORS[photo.tag]?.color }}>
            {TAG_COLORS[photo.tag]?.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: '#6B7280' }}>{new Date(photo.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
          {photo.weight && <span style={{ fontSize: 11, color: '#3B82F6', fontWeight: 700 }}>{photo.weight}</span>}
        </div>
      </div>
    </div>
  );
}

export default function FotosProgresso() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState(MOCK_PHOTOS);
  const [tab, setTab] = useState('galeria');
  const [modal, setModal] = useState(false);
  const [viewPhoto, setViewPhoto] = useState(null);
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');
  const [form, setForm] = useState({ label: '', date: new Date().toISOString().slice(0, 10), weight: '', tag: 'durante', file: null, previewUrl: '' });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (!user || !hasSupabase) return;
    (async () => {
      const { data: student } = await supabase.from('students').select('id').eq('user_id', user.id).maybeSingle();
      if (!student) return;
      const { data } = await supabase.from('progress_photos').select('*').eq('student_id', student.id).order('date', { ascending: true });
      if (data && data.length > 0) setPhotos(data.map(p => ({ ...p, url: p.url || null })));
    })();
  }, [user?.id]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setForm(f => ({ ...f, file, previewUrl: url }));
  };

  const save = async (e) => {
    e.preventDefault();
    setUploading(true);

    let finalUrl = form.previewUrl || null;

    if (hasSupabase && user && form.file) {
      const { data: student } = await supabase.from('students').select('id, personal_id').eq('user_id', user.id).maybeSingle();
      if (student) {
        const ext = form.file.name.split('.').pop();
        const path = `progress/${student.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, form.file, { contentType: form.file.type });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
          finalUrl = urlData.publicUrl;
        }

        const { data: newPhoto } = await supabase.from('progress_photos').insert({
          student_id: student.id, url: finalUrl,
          label: form.label, date: form.date,
          weight: form.weight ? `${form.weight}kg` : '', tag: form.tag,
        }).select().single();

        if (newPhoto) {
          setPhotos(p => [...p, newPhoto]);
          setUploading(false);
          setModal(false);
          setForm({ label: '', date: new Date().toISOString().slice(0, 10), weight: '', tag: 'durante', file: null, previewUrl: '' });
          return;
        }
      }
    }

    setPhotos(p => [...p, { id: Date.now(), url: finalUrl, label: form.label, date: form.date, weight: form.weight ? `${form.weight}kg` : '', tag: form.tag }]);
    setUploading(false);
    setModal(false);
    setForm({ label: '', date: new Date().toISOString().slice(0, 10), weight: '', tag: 'durante', file: null, previewUrl: '' });
  };

  const deletePhoto = async (id) => {
    if (hasSupabase) await supabase.from('progress_photos').delete().eq('id', id);
    setPhotos(p => p.filter(ph => ph.id !== id));
  };

  const photoA = photos.find(p => String(p.id) === compareA);
  const photoB = photos.find(p => String(p.id) === compareB);

  return (
    <div className="page-padding" style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--gray-900)' }}>Fotos de Progresso</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--gray-400)' }}>{photos.length} registros fotográficos</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus size={16} /> Adicionar Foto
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 10, padding: 4, marginBottom: 20, width: 'fit-content', gap: 2 }}>
        {[
          { key: 'galeria', label: '📸 Galeria' },
          { key: 'comparar', label: '🔀 Comparar' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              background: tab === t.key ? 'white' : 'transparent',
              color: tab === t.key ? '#111827' : '#6B7280',
              boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'galeria' && (
        <>
          <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)', border: '1px solid #DBEAFE', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 20 }}>📸</span>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1E40AF' }}>Registre sua evolução!</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#3B82F6' }}>
                Tire fotos no mesmo horário, posição e iluminação para uma comparação mais precisa.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }} className="photo-grid">
            {photos.map(p => (
              <PhotoCard key={p.id} photo={p} onView={setViewPhoto} onDelete={deletePhoto} />
            ))}
          </div>

          {photos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Camera size={48} color="#D1D5DB" style={{ marginBottom: 12 }} />
              <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: '#374151' }}>Nenhuma foto ainda</p>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#9CA3AF' }}>Adicione sua primeira foto de progresso</p>
              <button className="btn-primary" onClick={() => setModal(true)}><Plus size={15} /> Adicionar Foto</button>
            </div>
          )}
        </>
      )}

      {tab === 'comparar' && (
        <div>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 20 }}>
            <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#111827' }}>Selecione duas fotos para comparar</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Foto A (antes)</label>
                <select value={compareA} onChange={e => setCompareA(e.target.value)} style={{ width: '100%' }}>
                  <option value="">Selecione...</option>
                  {photos.map(p => (
                    <option key={p.id} value={String(p.id)}>
                      {p.label} — {new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR')} {p.weight ? `(${p.weight})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Foto B (depois)</label>
                <select value={compareB} onChange={e => setCompareB(e.target.value)} style={{ width: '100%' }}>
                  <option value="">Selecione...</option>
                  {photos.map(p => (
                    <option key={p.id} value={String(p.id)}>
                      {p.label} — {new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR')} {p.weight ? `(${p.weight})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Slider */}
          {photoA && photoB && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Arraste para comparar</p>
              <BeforeAfterSlider before={photoA} after={photoB} />
            </div>
          )}
          {(!photoA || !photoB) && (
            <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '32px 20px', textAlign: 'center', marginBottom: 20, border: '2px dashed #E5E7EB' }}>
              <p style={{ margin: 0, fontSize: 14, color: '#9CA3AF' }}>Selecione duas fotos para ver o slider de comparação</p>
            </div>
          )}

          {/* Comparison view */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }} className="compare-grid">
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Antes</p>
              <ComparePhoto photo={photoA} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GitCompare size={16} color="#9CA3AF" />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Depois</p>
              <ComparePhoto photo={photoB} />
            </div>
          </div>

          {photoA && photoB && photoA.weight && photoB.weight && (
            <div style={{ marginTop: 16, background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)', borderRadius: 12, padding: 16, display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { label: 'Peso inicial', value: photoA.weight, color: '#6B7280' },
                { label: 'Peso atual', value: photoB.weight, color: '#3B82F6' },
                {
                  label: 'Diferença',
                  value: (() => {
                    const a = parseFloat(photoA.weight);
                    const b = parseFloat(photoB.weight);
                    if (isNaN(a) || isNaN(b)) return '—';
                    const diff = b - a;
                    return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}kg`;
                  })(),
                  color: (() => {
                    const a = parseFloat(photoA.weight);
                    const b = parseFloat(photoB.weight);
                    return b < a ? '#10B981' : '#EF4444';
                  })(),
                },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#6B7280' }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #F3F4F6' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Adicionar Foto de Progresso</h3>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', display: 'flex' }}><X size={20} /></button>
            </div>
            <form onSubmit={save} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                onClick={() => fileRef.current.click()}
                style={{ height: 160, borderRadius: 12, border: '2px dashed #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: form.previewUrl ? `url(${form.previewUrl}) center/cover` : '#F9FAFB', overflow: 'hidden' }}
              >
                {!form.previewUrl && (
                  <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
                    <Camera size={32} style={{ marginBottom: 8 }} />
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Clique para selecionar foto</p>
                    <p style={{ margin: '4px 0 0', fontSize: 11 }}>JPG, PNG até 10MB</p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
              </div>
              <div>
                <label>Descrição *</label>
                <input placeholder="Ex: 3 meses de treino" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label>Data</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label>Peso (kg)</label>
                  <input type="number" step="0.1" placeholder="76.5" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
                </div>
                <div>
                  <label>Tag</label>
                  <select value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}>
                    <option value="antes">Antes</option>
                    <option value="durante">Durante</option>
                    <option value="depois">Depois</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid #F3F4F6' }}>
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={uploading}>{uploading ? 'Enviando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View modal */}
      {viewPhoto && (
        <div className="video-modal-backdrop" onClick={() => setViewPhoto(null)}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 500, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#111', borderRadius: '12px 12px 0 0' }}>
              <span style={{ color: 'white', fontWeight: 700 }}>{viewPhoto.label}</span>
              <button onClick={() => setViewPhoto(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
            </div>
            <img src={viewPhoto.url} alt={viewPhoto.label} style={{ width: '100%', display: 'block', borderRadius: '0 0 12px 12px' }} />
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .photo-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .compare-grid { flex-direction: column !important; }
        }
        @media (max-width: 480px) {
          .photo-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
