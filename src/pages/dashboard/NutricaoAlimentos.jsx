import { useState, useEffect } from 'react';
import { Apple, Plus, Search, Trash2, Edit2, X, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const CATEGORIES = ['Geral', 'Proteína', 'Carboidrato', 'Gordura', 'Vegetal', 'Fruta', 'Laticínio', 'Bebida', 'Outro'];

const EMPTY_FORM = { name: '', category: 'Geral', calories_per_100g: '', protein_per_100g: '', carbs_per_100g: '', fat_per_100g: '', fiber_per_100g: '' };

function FoodForm({ form, onChange, onSubmit, onClose, isEdit }) {
  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label>Nome do alimento *</label>
        <input name="name" value={form.name} onChange={onChange} placeholder="Ex: Frango grelhado" required autoFocus />
      </div>
      <div>
        <label>Categoria</label>
        <select name="category" value={form.category} onChange={onChange}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Valores por 100g
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label>Calorias (kcal)</label>
          <input name="calories_per_100g" type="number" min="0" step="0.1" value={form.calories_per_100g} onChange={onChange} placeholder="0" />
        </div>
        <div>
          <label>Proteína (g)</label>
          <input name="protein_per_100g" type="number" min="0" step="0.1" value={form.protein_per_100g} onChange={onChange} placeholder="0" />
        </div>
        <div>
          <label>Carboidrato (g)</label>
          <input name="carbs_per_100g" type="number" min="0" step="0.1" value={form.carbs_per_100g} onChange={onChange} placeholder="0" />
        </div>
        <div>
          <label>Gordura (g)</label>
          <input name="fat_per_100g" type="number" min="0" step="0.1" value={form.fat_per_100g} onChange={onChange} placeholder="0" />
        </div>
        <div>
          <label>Fibra (g)</label>
          <input name="fiber_per_100g" type="number" min="0" step="0.1" value={form.fiber_per_100g} onChange={onChange} placeholder="0" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--border-light)' }}>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn-primary">{isEdit ? 'Salvar' : 'Adicionar'}</button>
      </div>
    </form>
  );
}

export default function NutricaoAlimentos() {
  const { user } = useAuth();
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Todos');
  const [modal, setModal] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user?.id]);

  const load = async () => {
    if (!hasSupabase) { setLoading(false); return; }
    const { data } = await supabase.from('food_items').select('*').eq('personal_id', user.id).order('name');
    setFoods(data || []);
    setLoading(false);
  };

  const openAdd = () => { setEditingFood(null); setForm(EMPTY_FORM); setModal(true); };
  const openEdit = (food) => { setEditingFood(food); setForm({ ...food, calories_per_100g: food.calories_per_100g || '', protein_per_100g: food.protein_per_100g || '', carbs_per_100g: food.carbs_per_100g || '', fat_per_100g: food.fat_per_100g || '', fiber_per_100g: food.fiber_per_100g || '' }); setModal(true); };

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      personal_id: user.id,
      name: form.name,
      category: form.category,
      calories_per_100g: Number(form.calories_per_100g) || 0,
      protein_per_100g: Number(form.protein_per_100g) || 0,
      carbs_per_100g: Number(form.carbs_per_100g) || 0,
      fat_per_100g: Number(form.fat_per_100g) || 0,
      fiber_per_100g: Number(form.fiber_per_100g) || 0,
    };
    if (hasSupabase) {
      if (editingFood) {
        await supabase.from('food_items').update(payload).eq('id', editingFood.id);
      } else {
        await supabase.from('food_items').insert(payload);
      }
    }
    await load();
    setModal(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Remover este alimento?')) return;
    setDeletingId(id);
    if (hasSupabase) await supabase.from('food_items').delete().eq('id', id);
    setFoods(f => f.filter(x => x.id !== id));
    setDeletingId(null);
  };

  const categories = ['Todos', ...CATEGORIES];
  const filtered = foods.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'Todos' || f.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="page-padding">

      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Banco de Alimentos</h2>
          <p className="page-subtitle">{foods.length} alimento{foods.length !== 1 ? 's' : ''} cadastrado{foods.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="page-actions">
          <button onClick={openAdd} className="btn-primary"><Plus size={16} /> Novo alimento</button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="toolbar">
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={14} color="var(--gray-400)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar alimento..." />
        </div>
        <div className="filter-pills" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
          {categories.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} className={`pill${catFilter === c ? ' active' : ''}`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Table / Cards */}
      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <div className="empty-state-icon"><Apple size={24} /></div>
          <p className="empty-state-title">Nenhum alimento encontrado</p>
          <p className="empty-state-desc">Adicione alimentos para montar planos alimentares</p>
          <button onClick={openAdd} className="btn-primary" style={{ marginTop: 8 }}><Plus size={15} /> Adicionar alimento</button>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
          {/* Desktop header */}
          <div className="alunos-desktop-table">
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 70px 70px 70px 80px', gap: 0, padding: '10px 18px', borderBottom: '1px solid var(--border-light)', background: 'var(--gray-50)' }}>
              {['Alimento', 'Categoria', 'Kcal', 'Prot.', 'Carb.', 'Gord.', ''].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
              ))}
            </div>
            {filtered.map((food, i) => (
              <div key={food.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 70px 70px 70px 80px', gap: 0, padding: '12px 18px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none', alignItems: 'center', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-900)' }}>{food.name}</span>
                <span style={{ fontSize: 12, color: 'var(--gray-500)', background: 'var(--gray-100)', padding: '2px 8px', borderRadius: 20, display: 'inline-block', width: 'fit-content' }}>{food.category}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#EF4444' }}>{food.calories_per_100g || 0}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#6366F1' }}>{food.protein_per_100g || 0}g</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B' }}>{food.carbs_per_100g || 0}g</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>{food.fat_per_100g || 0}g</span>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button onClick={() => openEdit(food)} className="icon-box icon-box-sm icon-box-gray" style={{ border: 'none', cursor: 'pointer' }}>
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => handleDelete(food.id)} disabled={deletingId === food.id} className="icon-box icon-box-sm icon-box-red" style={{ border: 'none', cursor: 'pointer', opacity: deletingId === food.id ? 0.5 : 1 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="alunos-mobile-cards">
            {filtered.map((food, i) => (
              <div key={food.id} style={{ padding: '14px 16px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--gray-900)' }}>{food.name}</p>
                    <span style={{ fontSize: 11, color: 'var(--gray-500)', background: 'var(--gray-100)', padding: '1px 7px', borderRadius: 20 }}>{food.category}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(food)} className="icon-box icon-box-sm icon-box-gray" style={{ border: 'none', cursor: 'pointer', width: 32, height: 32 }}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(food.id)} className="icon-box icon-box-sm icon-box-red" style={{ border: 'none', cursor: 'pointer', width: 32, height: 32 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[
                    { label: 'Kcal', value: food.calories_per_100g || 0, color: '#EF4444' },
                    { label: 'Prot.', value: `${food.protein_per_100g || 0}g`, color: '#6366F1' },
                    { label: 'Carb.', value: `${food.carbs_per_100g || 0}g`, color: '#F59E0B' },
                    { label: 'Gord.', value: `${food.fat_per_100g || 0}g`, color: '#10B981' },
                  ].map(m => (
                    <div key={m.label} style={{ textAlign: 'center', padding: '6px', background: 'var(--gray-50)', borderRadius: 8 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: m.color }}>{m.value}</p>
                      <p style={{ margin: 0, fontSize: 10, color: 'var(--gray-400)', fontWeight: 600 }}>{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--gray-900)' }}>
                {editingFood ? 'Editar alimento' : 'Novo alimento'}
              </h3>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: 4, lineHeight: 0 }}>
                <X size={18} />
              </button>
            </div>
            <FoodForm form={form} onChange={handleChange} onSubmit={handleSubmit} onClose={() => setModal(false)} isEdit={!!editingFood} />
          </div>
        </div>
      )}
    </div>
  );
}
