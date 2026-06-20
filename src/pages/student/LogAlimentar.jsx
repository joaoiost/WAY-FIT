import { useState, useEffect } from 'react';
import { Search, Plus, Trash2, ChevronDown, ChevronUp, X, Utensils, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import tacoFoods from '../../data/taco_foods.json';

const MEALS = [
  { key: 'cafe',       label: 'Café da manhã', emoji: '☀️' },
  { key: 'lanche1',   label: 'Lanche manhã',  emoji: '🍌' },
  { key: 'pre_treino',label: 'Pré-treino',    emoji: '⚡' },
  { key: 'almoco',    label: 'Almoço',        emoji: '🍱' },
  { key: 'lanche2',   label: 'Lanche tarde',  emoji: '🥤' },
  { key: 'jantar',    label: 'Jantar',        emoji: '🌙' },
  { key: 'pos_treino',label: 'Pós-treino',    emoji: '💪' },
  { key: 'ceia',      label: 'Ceia',          emoji: '🌛' },
];

const MACRO_COLORS = { kcal: '#F59E0B', protein_g: '#3B82F6', carbs_g: '#10B981', fat_g: '#F87171' };
const MACRO_LABELS = { kcal: 'Kcal', protein_g: 'Prot', carbs_g: 'Carb', fat_g: 'Gord' };
const MACRO_UNITS  = { kcal: 'kcal', protein_g: 'g', carbs_g: 'g', fat_g: 'g' };

function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}
function prevDay(d) { const dt = new Date(d + 'T12:00:00'); dt.setDate(dt.getDate() - 1); return dt.toISOString().slice(0, 10); }
function nextDay(d) { const dt = new Date(d + 'T12:00:00'); dt.setDate(dt.getDate() + 1); return dt.toISOString().slice(0, 10); }

export default function LogAlimentar() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayStr());
  const [logs, setLogs] = useState([]);
  const [macroGoals, setMacroGoals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingMeal, setAddingMeal] = useState(null);
  const [expandedMeal, setExpandedMeal] = useState('cafe');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [qty, setQty] = useState('100');
  const [customMode, setCustomMode] = useState(false);
  const [customFood, setCustomFood] = useState({ name: '', qty: '100', kcal: '', protein_g: '', carbs_g: '', fat_g: '' });
  const [personalId, setPersonalId] = useState(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('students').select('personal_id').eq('id', user.id).single()
      .then(({ data }) => setPersonalId(data?.personal_id || null));
  }, [user?.id]);

  useEffect(() => {
    if (!user || !hasSupabase) { setLoading(false); return; }
    loadData();
  }, [user?.id, date]);

  async function loadData() {
    setLoading(true);
    const [logsRes, planRes] = await Promise.all([
      supabase.from('food_logs').select('*').eq('student_id', user.id).eq('date', date).order('created_at'),
      supabase.from('meal_plans').select('goal_calories,goal_protein_g,goal_carbs_g,goal_fat_g').eq('student_id', user.id).eq('is_active', true).single(),
    ]);
    setLogs(logsRes.data || []);
    setMacroGoals(planRes.data || null);
    setLoading(false);
  }

  const totals = logs.reduce((acc, l) => ({
    kcal: acc.kcal + (l.kcal || 0),
    protein_g: acc.protein_g + (l.protein_g || 0),
    carbs_g: acc.carbs_g + (l.carbs_g || 0),
    fat_g: acc.fat_g + (l.fat_g || 0),
  }), { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

  const goals = macroGoals
    ? { kcal: macroGoals.goal_calories, protein_g: macroGoals.goal_protein_g, carbs_g: macroGoals.goal_carbs_g, fat_g: macroGoals.goal_fat_g }
    : null;

  const searchResults = searchQuery.trim().length >= 1
    ? tacoFoods.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 20)
    : [];

  async function addFood() {
    if (!selectedFood && !customMode) return;
    const q = parseFloat(customMode ? customFood.qty : qty) || 100;
    const ratio = q / 100;
    let entry;
    if (customMode) {
      entry = {
        student_id: user.id,
        personal_id: personalId,
        date,
        meal_type: addingMeal,
        food_name: customFood.name || 'Alimento personalizado',
        quantity_g: q,
        kcal: parseFloat(customFood.kcal) || 0,
        protein_g: parseFloat(customFood.protein_g) || 0,
        carbs_g: parseFloat(customFood.carbs_g) || 0,
        fat_g: parseFloat(customFood.fat_g) || 0,
      };
    } else {
      entry = {
        student_id: user.id,
        personal_id: personalId,
        date,
        meal_type: addingMeal,
        food_name: selectedFood.name,
        quantity_g: q,
        kcal: Math.round(selectedFood.kcal * ratio),
        protein_g: Math.round(selectedFood.protein_g * ratio * 10) / 10,
        carbs_g: Math.round(selectedFood.carbs_g * ratio * 10) / 10,
        fat_g: Math.round(selectedFood.fat_g * ratio * 10) / 10,
      };
    }
    await supabase.from('food_logs').insert(entry);
    setAddingMeal(null);
    setSelectedFood(null);
    setSearchQuery('');
    setQty('100');
    setCustomMode(false);
    setCustomFood({ name: '', qty: '100', kcal: '', protein_g: '', carbs_g: '', fat_g: '' });
    loadData();
  }

  async function removeLog(id) {
    await supabase.from('food_logs').delete().eq('id', id);
    loadData();
  }

  return (
    <div className="page-padding" style={{ paddingBottom: 100 }}>
      {/* Date nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={() => setDate(prevDay(date))} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={16} color="var(--gray-400)" />
        </button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--gray-900)', textTransform: 'capitalize' }}>{fmtDate(date)}</p>
          {date === todayStr() && <p style={{ margin: 0, fontSize: 11, color: 'var(--accent)' }}>Hoje</p>}
        </div>
        <button onClick={() => setDate(nextDay(date))} disabled={date >= todayStr()} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: date >= todayStr() ? 'not-allowed' : 'pointer', opacity: date >= todayStr() ? 0.3 : 1 }}>
          <ChevronRight size={16} color="var(--gray-400)" />
        </button>
      </div>

      {/* Macro summary */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-400)' }}>Total do dia</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--gray-900)' }}>
            {Math.round(totals.kcal)}{goals?.kcal ? <span style={{ fontSize: 13, color: 'var(--gray-400)', fontWeight: 600 }}> / {goals.kcal} kcal</span> : ' kcal'}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {['protein_g', 'carbs_g', 'fat_g'].map(k => {
            const pct = goals?.[k] ? Math.min(100, Math.round((totals[k] / goals[k]) * 100)) : null;
            return (
              <div key={k}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: MACRO_COLORS[k] }}>{MACRO_LABELS[k]}</span>
                  <span style={{ fontSize: 10, color: 'var(--gray-400)' }}>{Math.round(totals[k] * 10) / 10}{MACRO_UNITS[k]}{goals?.[k] ? `/${goals[k]}g` : ''}</span>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: pct !== null ? `${pct}%` : '0%', background: MACRO_COLORS[k], borderRadius: 99 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Meal sections */}
      {MEALS.map(meal => {
        const mealLogs = logs.filter(l => l.meal_type === meal.key);
        const mealKcal = mealLogs.reduce((s, l) => s + (l.kcal || 0), 0);
        const open = expandedMeal === meal.key;
        return (
          <div key={meal.key} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
            <button onClick={() => setExpandedMeal(open ? null : meal.key)}
              style={{ width: '100%', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontSize: 18 }}>{meal.emoji}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--gray-900)' }}>{meal.label}</span>
              {mealLogs.length > 0 && <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{Math.round(mealKcal)} kcal</span>}
              {open ? <ChevronUp size={16} color="var(--gray-400)" /> : <ChevronDown size={16} color="var(--gray-400)" />}
            </button>
            {open && (
              <div style={{ padding: '0 16px 12px' }}>
                {mealLogs.map(log => (
                  <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--gray-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.food_name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)' }}>
                        {log.quantity_g}g · {Math.round(log.kcal || 0)} kcal · P:{Math.round((log.protein_g || 0) * 10) / 10}g · C:{Math.round((log.carbs_g || 0) * 10) / 10}g · G:{Math.round((log.fat_g || 0) * 10) / 10}g
                      </p>
                    </div>
                    <button onClick={() => removeLog(log.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                      <Trash2 size={14} color="var(--red)" />
                    </button>
                  </div>
                ))}
                <button onClick={() => { setAddingMeal(meal.key); setCustomMode(false); setSelectedFood(null); setSearchQuery(''); }}
                  style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px dashed var(--border)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', width: '100%', color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
                  <Plus size={14} /> Adicionar alimento
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Add food modal */}
      {addingMeal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: '0 0 20px 20px', padding: '16px 16px 0', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--gray-900)' }}>
                {MEALS.find(m => m.key === addingMeal)?.emoji} {MEALS.find(m => m.key === addingMeal)?.label}
              </p>
              <button onClick={() => setAddingMeal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--gray-400)" />
              </button>
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 12 }}>
              {['Buscar', 'Manual'].map(t => (
                <button key={t} onClick={() => { setCustomMode(t === 'Manual'); setSelectedFood(null); setSearchQuery(''); }}
                  style={{ flex: 1, padding: '8px 0', background: 'none', border: 'none', borderBottom: `2px solid ${(t === 'Manual') === customMode ? 'var(--accent)' : 'transparent'}`, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: (t === 'Manual') === customMode ? 'var(--accent)' : 'var(--gray-400)' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            {!customMode ? (
              <>
                {!selectedFood ? (
                  <>
                    <div className="search-bar" style={{ marginBottom: 12 }}>
                      <Search size={14} color="var(--gray-400)" />
                      <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar alimento (ex: frango, arroz...)" style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--gray-900)', fontSize: 14, flex: 1 }} />
                    </div>
                    {searchQuery.trim().length >= 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {searchResults.length === 0 && <p style={{ color: 'var(--gray-400)', fontSize: 13, textAlign: 'center' }}>Nenhum resultado</p>}
                        {searchResults.map(f => (
                          <button key={f.id} onClick={() => { setSelectedFood(f); setQty('100'); }}
                            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left' }}>
                            <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 700, color: 'var(--gray-900)' }}>{f.name}</p>
                            <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)' }}>por 100g · {f.kcal} kcal · P:{f.protein_g}g · C:{f.carbs_g}g · G:{f.fat_g}g</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchQuery.trim().length === 0 && (
                      <p style={{ color: 'var(--gray-400)', fontSize: 13, textAlign: 'center', marginTop: 20 }}>
                        Digite para buscar entre {tacoFoods.length} alimentos
                      </p>
                    )}
                  </>
                ) : (
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                    <button onClick={() => setSelectedFood(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 13, marginBottom: 10, padding: 0 }}>← Voltar</button>
                    <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: 'var(--gray-900)' }}>{selectedFood.name}</p>
                    <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--gray-400)' }}>{selectedFood.category}</p>

                    <label style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 600 }}>Quantidade (g)</label>
                    <input type="number" value={qty} onChange={e => setQty(e.target.value)} min={1}
                      style={{ display: 'block', width: '100%', marginTop: 4, marginBottom: 14, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--gray-900)', fontSize: 15, fontWeight: 700, boxSizing: 'border-box' }} />

                    {(() => {
                      const r = (parseFloat(qty) || 100) / 100;
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 16 }}>
                          {[['Kcal','kcal',''], ['Prot','protein_g','g'], ['Carb','carbs_g','g'], ['Gord','fat_g','g']].map(([l, k, u]) => (
                            <div key={k} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: 'var(--bg-page)', border: '1px solid var(--border)' }}>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: MACRO_COLORS[k] }}>{Math.round(selectedFood[k] * r * 10) / 10}{u}</p>
                              <p style={{ margin: 0, fontSize: 9, color: 'var(--gray-400)', fontWeight: 600 }}>{l}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    <button onClick={addFood} className="btn-primary" style={{ width: '100%', padding: '13px 0', fontSize: 15, fontWeight: 700 }}>
                      Adicionar
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                {[
                  ['Nome do alimento', 'name', 'text'],
                  ['Quantidade (g)', 'qty', 'number'],
                  ['Calorias (kcal)', 'kcal', 'number'],
                  ['Proteína (g)', 'protein_g', 'number'],
                  ['Carboidratos (g)', 'carbs_g', 'number'],
                  ['Gorduras (g)', 'fat_g', 'number'],
                ].map(([label, key, type]) => (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 600 }}>{label}</label>
                    <input type={type} value={customFood[key]} onChange={e => setCustomFood(p => ({ ...p, [key]: e.target.value }))} placeholder={type === 'number' ? '0' : ''}
                      style={{ display: 'block', width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--gray-900)', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                ))}
                <button onClick={addFood} disabled={!customFood.name} className="btn-primary" style={{ width: '100%', padding: '13px 0', fontSize: 15, fontWeight: 700, marginTop: 4 }}>
                  Adicionar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
