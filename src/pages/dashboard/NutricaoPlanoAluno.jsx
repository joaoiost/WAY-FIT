import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Search, X, Save, ChevronDown,
  Droplets, AlertCircle, Check, Target, Zap, Calculator,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import tacoFoods from '../../data/taco_foods.json';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_MEALS = [
  { name: 'Café da manhã',   time_of_day: '07:00', order_index: 0 },
  { name: 'Lanche da manhã', time_of_day: '10:00', order_index: 1 },
  { name: 'Almoço',          time_of_day: '12:30', order_index: 2 },
  { name: 'Lanche da tarde', time_of_day: '15:30', order_index: 3 },
  { name: 'Jantar',          time_of_day: '19:00', order_index: 4 },
];

const MACRO_COLORS = { cal: '#EF4444', prot: '#6366F1', carb: '#F59E0B', fat: '#10B981' };

const ACTIVITY_LEVELS = [
  { key: 'sedentario',  label: 'Sedentário',         sub: 'menos de 1x/semana', factor: 1.2   },
  { key: 'leve',        label: 'Levemente ativo',     sub: '1–3x/semana',        factor: 1.375 },
  { key: 'moderado',    label: 'Moderadamente ativo', sub: '3–5x/semana',        factor: 1.55  },
  { key: 'muito_ativo', label: 'Muito ativo',         sub: '6–7x/semana',        factor: 1.725 },
  { key: 'atleta',      label: 'Atleta',              sub: 'treino 2x/dia',      factor: 1.9   },
];

const GOALS_TMB = [
  { key: 'emagrecimento', label: 'Emagrecer',   kcalDelta: -400, protFactor: 2.0, fatFactor: 0.8 },
  { key: 'manutencao',    label: 'Manutenção',   kcalDelta:    0, protFactor: 1.8, fatFactor: 0.9 },
  { key: 'ganho',         label: 'Ganhar massa', kcalDelta: +300, protFactor: 2.2, fatFactor: 1.0 },
  { key: 'definicao',     label: 'Definição',    kcalDelta: -200, protFactor: 2.5, fatFactor: 0.8 },
];

const ANAMNESE_INIT = {
  weight: '', height: '', age: '', sex: 'feminino',
  activity_level: 'moderado',
  goal: '', allergies: '', restrictions: '', preferences: '',
  conditions: '', medications: '', workout_time: '',
  meal_count: 5, water_goal_ml: 2000, notes: '',
};

// Temas visuais por tipo de refeição
const MEAL_THEMES = {
  cafe:    { color: '#D97706', bg: 'rgba(217,119,6,0.12)',   emoji: '☕' },
  almoco:  { color: '#2563EB', bg: 'rgba(37,99,235,0.1)',    emoji: '🍽️' },
  lanche:  { color: '#059669', bg: 'rgba(5,150,105,0.1)',    emoji: '🥗' },
  jantar:  { color: '#9333EA', bg: 'rgba(147,51,234,0.1)',   emoji: '🌙' },
  ceia:    { color: '#0284C7', bg: 'rgba(2,132,199,0.1)',    emoji: '⭐' },
  pre:     { color: '#E11D48', bg: 'rgba(225,29,72,0.1)',    emoji: '⚡' },
  default: { color: '#64748B', bg: 'rgba(100,116,139,0.1)', emoji: '🥘' },
};

function getMealTheme(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('cafe') || n.includes('café') || n.includes('manhã') || n.includes('manha')) return MEAL_THEMES.cafe;
  if (n.includes('almoço') || n.includes('almoco')) return MEAL_THEMES.almoco;
  if (n.includes('jantar')) return MEAL_THEMES.jantar;
  if (n.includes('ceia') || n.includes('noite')) return MEAL_THEMES.ceia;
  if (n.includes('pré') || n.includes('pre') || n.includes('treino')) return MEAL_THEMES.pre;
  if (n.includes('lanche') || n.includes('tarde')) return MEAL_THEMES.lanche;
  return MEAL_THEMES.default;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcMacros(foods) {
  return foods.reduce(
    (acc, f) => ({
      cal:  acc.cal  + (f.calories  || 0),
      prot: acc.prot + (f.protein_g || 0),
      carb: acc.carb + (f.carbs_g   || 0),
      fat:  acc.fat  + (f.fat_g     || 0),
    }),
    { cal: 0, prot: 0, carb: 0, fat: 0 },
  );
}

function calcTMB(weight, height, age, sex) {
  const w = parseFloat(weight);
  const h = parseInt(height, 10);
  const a = parseInt(age, 10);
  if (!w || !h || !a) return null;
  return sex === 'masculino'
    ? 10 * w + 6.25 * h - 5 * a + 5
    : 10 * w + 6.25 * h - 5 * a - 161;
}

function calcSuggestedMacros(tdee, weight, goalKey) {
  const g = GOALS_TMB.find(x => x.key === goalKey) || GOALS_TMB[0];
  const w = parseFloat(weight) || 0;
  const targetKcal = Math.round(tdee + g.kcalDelta);
  const protein    = Math.round(g.protFactor * w);
  const fat        = Math.round(g.fatFactor  * w);
  const carbs      = Math.max(0, Math.round((targetKcal - protein * 4 - fat * 9) / 4));
  return { calories: targetKcal, protein, fat, carbs };
}

// ─── CalorieRing ──────────────────────────────────────────────────────────────

function CalorieRing({ consumed, goal }) {
  const size = 108;
  const r = 44;
  const cx = 54, cy = 54;
  const pct = goal > 0 ? Math.min(1, consumed / goal) : 0;
  const circumference = 2 * Math.PI * r;
  const dash = pct * circumference;
  const over = goal > 0 && consumed > goal;
  const ringColor = consumed === 0 ? 'var(--border)' : over ? 'var(--red)' : 'var(--accent)';

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ display: 'block' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="11" />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={ringColor} strokeWidth="11"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <span style={{ fontSize: 19, fontWeight: 900, color: over ? 'var(--red)' : 'var(--gray-900)', lineHeight: 1 }}>
          {Math.round(consumed)}
        </span>
        {goal > 0 && (
          <span style={{ fontSize: 9, color: 'var(--gray-400)', fontWeight: 600 }}>de {Math.round(goal)}</span>
        )}
        <span style={{ fontSize: 9, color: 'var(--gray-400)', fontWeight: 500 }}>kcal</span>
      </div>
    </div>
  );
}

// ─── MacroBar ─────────────────────────────────────────────────────────────────

function MacroBar({ label, value, goal, color, onGoalChange }) {
  const [editing, setEditing] = useState(false);
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
        {editing ? (
          <input
            type="number"
            defaultValue={goal || ''}
            autoFocus
            onBlur={e => { onGoalChange(e.target.value); setEditing(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { onGoalChange(e.target.value); setEditing(false); } }}
            style={{ width: 64, textAlign: 'right', fontSize: 11, fontWeight: 700, color, border: `1.5px solid ${color}`, borderRadius: 5, padding: '1px 4px', background: 'transparent', outline: 'none', boxShadow: 'none' }}
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            title="Clique para editar meta"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11, fontWeight: 800, color, display: 'flex', alignItems: 'center', gap: 2 }}
          >
            <span style={{ color: 'var(--gray-600)' }}>{Math.round(value)}g</span>
            {goal > 0 && <span style={{ color: 'var(--gray-400)', fontWeight: 500 }}>/{goal}g</span>}
          </button>
        )}
      </div>
      <div style={{ height: 6, borderRadius: 99, background: color + '20' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: color, transition: 'width 0.4s ease', minWidth: value > 0 ? 4 : 0 }} />
      </div>
    </div>
  );
}

// ─── QuickCalcPanel ───────────────────────────────────────────────────────────

function QuickCalcPanel({ anamnese, onApply, onClose }) {
  const [form, setForm] = useState({
    weight:   anamnese.weight         || '',
    height:   anamnese.height         || '',
    age:      anamnese.age            || '',
    sex:      anamnese.sex            || 'feminino',
    activity: anamnese.activity_level || 'moderado',
    goal:     'manutencao',
  });

  const tmb       = calcTMB(form.weight, form.height, form.age, form.sex);
  const factor    = ACTIVITY_LEVELS.find(a => a.key === form.activity)?.factor || 1.55;
  const tdee      = tmb ? Math.round(tmb * factor) : null;
  const suggested = tdee ? calcSuggestedMacros(tdee, form.weight, form.goal) : null;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ background: 'var(--bg-page)', borderRadius: 12, border: '1.5px solid var(--accent)', padding: 16, marginTop: 2, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calculator size={14} color="var(--accent)" />
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-900)' }}>Calcular metas automaticamente</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', lineHeight: 0 }}>
          <X size={15} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
        {[
          { key: 'weight', label: 'Peso (kg)', placeholder: '70' },
          { key: 'height', label: 'Altura (cm)', placeholder: '168' },
          { key: 'age',    label: 'Idade',       placeholder: '28' },
        ].map(f => (
          <div key={f.key}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 3 }}>{f.label}</label>
            <input
              type="number"
              value={form[f.key]}
              onChange={e => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              style={{ width: '100%', fontSize: 14, fontWeight: 700, textAlign: 'center' }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {['feminino', 'masculino'].map(s => (
          <button key={s} onClick={() => set('sex', s)}
            style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: `1.5px solid ${form.sex === s ? 'var(--accent)' : 'var(--border)'}`, background: form.sex === s ? 'var(--accent-bg)' : 'var(--bg-surface)', color: form.sex === s ? 'var(--accent-text)' : 'var(--gray-500)', fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize' }}
          >{s}</button>
        ))}
      </div>

      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Nível de atividade</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
        {ACTIVITY_LEVELS.map(a => (
          <button key={a.key} onClick={() => set('activity', a.key)}
            style={{ padding: '5px 10px', borderRadius: 20, border: `1.5px solid ${form.activity === a.key ? 'var(--accent)' : 'var(--border)'}`, background: form.activity === a.key ? 'var(--accent-bg)' : 'var(--bg-surface)', color: form.activity === a.key ? 'var(--accent-text)' : 'var(--gray-500)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >{a.label}</button>
        ))}
      </div>

      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Objetivo</label>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
        {GOALS_TMB.map(g => (
          <button key={g.key} onClick={() => set('goal', g.key)}
            style={{ padding: '5px 10px', borderRadius: 20, border: `1.5px solid ${form.goal === g.key ? 'var(--accent)' : 'var(--border)'}`, background: form.goal === g.key ? 'var(--accent-bg)' : 'var(--bg-surface)', color: form.goal === g.key ? 'var(--accent-text)' : 'var(--gray-500)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >{g.label}</button>
        ))}
      </div>

      {suggested ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 10 }}>
            {[
              { label: 'Kcal', value: suggested.calories, color: MACRO_COLORS.cal,  unit: ''  },
              { label: 'Prot', value: suggested.protein,  color: MACRO_COLORS.prot, unit: 'g' },
              { label: 'Carb', value: suggested.carbs,    color: MACRO_COLORS.carb, unit: 'g' },
              { label: 'Gord', value: suggested.fat,      color: MACRO_COLORS.fat,  unit: 'g' },
            ].map(m => (
              <div key={m.label} style={{ textAlign: 'center', padding: '8px 4px', background: m.color + '12', borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: m.color }}>{m.value}{m.unit}</p>
                <p style={{ margin: 0, fontSize: 9, color: m.color, fontWeight: 700, textTransform: 'uppercase' }}>{m.label}</p>
              </div>
            ))}
          </div>
          <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--gray-400)', textAlign: 'center' }}>
            TMB: {Math.round(tmb)} kcal · TDEE: {tdee} kcal
          </p>
          <button
            onClick={() => { onApply(suggested); onClose(); }}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', gap: 6 }}
          >
            <Check size={14} /> Aplicar estas metas ao plano
          </button>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', padding: '8px 0' }}>
          Preencha peso, altura e idade para calcular
        </p>
      )}
    </div>
  );
}

// ─── FoodSearch ───────────────────────────────────────────────────────────────

function FoodSearch({ foods, onAdd, onClose }) {
  const [q, setQ]               = useState('');
  const [qty, setQty]           = useState(100);
  const [selected, setSelected] = useState(null);
  const inputRef                = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  const allFoodsMerged = useMemo(() => {
    const customNames = new Set(foods.map(f => f.name.toLowerCase()));
    const tacoNorm = tacoFoods
      .filter(f => !customNames.has(f.name.toLowerCase()))
      .map(f => ({
        id: `taco_${f.id}`,
        name: f.name,
        category: f.category || 'TACO',
        calories_per_100g: f.kcal      ?? 0,
        protein_per_100g:  f.protein_g ?? 0,
        carbs_per_100g:    f.carbs_g   ?? 0,
        fat_per_100g:      f.fat_g     ?? 0,
      }));
    return [...foods, ...tacoNorm];
  }, [foods]);

  const results = q.length < 2
    ? []
    : allFoodsMerged.filter(f => f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8);

  const preview = selected ? {
    cal:  ((selected.calories_per_100g || 0) * qty / 100).toFixed(1),
    prot: ((selected.protein_per_100g  || 0) * qty / 100).toFixed(1),
    carb: ((selected.carbs_per_100g    || 0) * qty / 100).toFixed(1),
    fat:  ((selected.fat_per_100g      || 0) * qty / 100).toFixed(1),
  } : null;

  const handleAdd = () => {
    if (!selected) return;
    const isTaco = String(selected.id).startsWith('taco_');
    onAdd({
      food_item_id: isTaco ? null : selected.id,
      name:         selected.name,
      quantity_g:   qty,
      calories:     Number(preview.cal),
      protein_g:    Number(preview.prot),
      carbs_g:      Number(preview.carb),
      fat_g:        Number(preview.fat),
      order_index:  0,
    });
    onClose();
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg-surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, padding: '20px 20px 32px', maxHeight: '88vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '-8px auto 16px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--gray-900)' }}>Adicionar alimento</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', lineHeight: 0 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-page)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '10px 14px', marginBottom: 10 }}>
          <Search size={16} color="var(--gray-400)" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => { setQ(e.target.value); setSelected(null); }}
            placeholder={`Buscar entre ${(tacoFoods.length + foods.length).toLocaleString()} alimentos...`}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 14, flex: 1, padding: 0, boxShadow: 'none', color: 'var(--gray-900)', WebkitTextFillColor: 'var(--gray-900)' }}
          />
          {q.length > 0 && (
            <button onClick={() => { setQ(''); setSelected(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', lineHeight: 0 }}>
              <X size={14} />
            </button>
          )}
        </div>

        {q.length < 2 && (
          <p style={{ margin: '4px 0 10px', fontSize: 12, color: 'var(--gray-400)', textAlign: 'center' }}>
            Digite ao menos 2 letras para buscar
          </p>
        )}

        {q.length >= 2 && results.length === 0 && (
          <button
            onClick={() => { onAdd({ food_item_id: null, name: q, quantity_g: qty, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, order_index: 0 }); onClose(); }}
            style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px dashed var(--border)', background: 'var(--bg-page)', color: 'var(--gray-500)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left', marginBottom: 12 }}
          >
            + Adicionar "{q}" manualmente (sem macros)
          </button>
        )}

        {results.map(f => (
          <div
            key={f.id}
            onClick={() => setSelected(f)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, marginBottom: 4, background: selected?.id === f.id ? 'var(--accent-bg)' : 'var(--bg-page)', border: `1.5px solid ${selected?.id === f.id ? 'var(--accent)' : 'transparent'}`, cursor: 'pointer', transition: 'all 0.1s' }}
          >
            <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--gray-900)' }}>{f.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)' }}>
                {f.calories_per_100g} kcal · {f.protein_per_100g}g P · {f.carbs_per_100g}g C / 100g
              </p>
            </div>
            {selected?.id === f.id && <Check size={16} color="var(--accent)" style={{ flexShrink: 0 }} />}
          </div>
        ))}

        {selected && (
          <div style={{ marginTop: 12, padding: 14, background: 'var(--bg-page)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>
              Quantidade
            </label>

            {/* Serving presets */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
              {[50, 100, 150, 200, 250, 300].map(g => (
                <button
                  key={g}
                  onClick={() => setQty(g)}
                  style={{ padding: '5px 10px', borderRadius: 8, border: `1.5px solid ${qty === g ? 'var(--accent)' : 'var(--border)'}`, background: qty === g ? 'var(--accent-bg)' : 'var(--bg-surface)', color: qty === g ? 'var(--accent-text)' : 'var(--gray-500)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  {g}g
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <input
                type="number"
                value={qty}
                min="1"
                onChange={e => setQty(Number(e.target.value) || 100)}
                style={{ width: 80, textAlign: 'center', fontWeight: 700, fontSize: 16 }}
              />
              <span style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 600 }}>gramas</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {[
                { label: 'Kcal', value: preview.cal,  color: MACRO_COLORS.cal  },
                { label: 'Prot', value: preview.prot, color: MACRO_COLORS.prot },
                { label: 'Carb', value: preview.carb, color: MACRO_COLORS.carb },
                { label: 'Gord', value: preview.fat,  color: MACRO_COLORS.fat  },
              ].map(m => (
                <div key={m.label} style={{ textAlign: 'center', padding: '8px 4px', background: m.color + '12', borderRadius: 8 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: m.color }}>{m.value}</p>
                  <p style={{ margin: 0, fontSize: 9, color: m.color, fontWeight: 700, textTransform: 'uppercase' }}>{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={!selected}
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 14, opacity: selected ? 1 : 0.5 }}
        >
          <Plus size={16} /> Adicionar ao plano
        </button>
      </div>
    </div>
  );
}

// ─── MealCard (MyFitnessPal style) ────────────────────────────────────────────

function MealCard({ meal, foods, allFoods, onAddFood, onRemoveFood, onUpdateMeal, onDelete }) {
  const [open, setOpen]             = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const macros = calcMacros(foods);
  const theme  = getMealTheme(meal.name);

  return (
    <div style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: open ? '1px solid var(--border-light)' : 'none' }}>

        {/* Emoji icon */}
        <div
          onClick={() => setOpen(o => !o)}
          style={{ width: 42, height: 42, borderRadius: 13, background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20, cursor: 'pointer' }}
        >
          {theme.emoji}
        </div>

        {/* Name + time */}
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
          {editingName ? (
            <input
              autoFocus
              defaultValue={meal.name}
              onBlur={e => { onUpdateMeal({ ...meal, name: e.target.value }); setEditingName(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { onUpdateMeal({ ...meal, name: e.target.value }); setEditingName(false); } }}
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-900)', border: '1.5px solid var(--accent)', borderRadius: 6, padding: '2px 6px', background: 'var(--bg-surface)', outline: 'none', boxShadow: 'none', width: '100%', marginBottom: 2 }}
            />
          ) : (
            <p
              style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--gray-900)', cursor: 'pointer' }}
              onDoubleClick={e => { e.stopPropagation(); setEditingName(true); }}
            >
              {meal.name}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <input
              type="time"
              value={meal.time_of_day || ''}
              onClick={e => e.stopPropagation()}
              onChange={e => onUpdateMeal({ ...meal, time_of_day: e.target.value })}
              style={{ fontSize: 11, color: 'var(--gray-400)', border: 'none', outline: 'none', background: 'transparent', padding: 0, width: 'auto', boxShadow: 'none', fontWeight: 600 }}
            />
            <span style={{ fontSize: 11, color: 'var(--border)' }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
              {foods.length} item{foods.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* kcal total */}
        {macros.cal > 0 && (
          <span style={{ fontSize: 14, fontWeight: 900, color: MACRO_COLORS.cal, flexShrink: 0 }}>
            {Math.round(macros.cal)}<span style={{ fontSize: 10, fontWeight: 500, color: 'var(--gray-400)', marginLeft: 2 }}>kcal</span>
          </span>
        )}

        {/* Add food (prominent blue button) */}
        <button
          onClick={e => { e.stopPropagation(); setShowSearch(true); }}
          style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          title="Adicionar alimento"
        >
          <Plus size={17} color="white" />
        </button>

        {onDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ width: 34, height: 34, borderRadius: 10, background: '#FEF2F2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            title="Remover refeição"
          >
            <Trash2 size={14} color="var(--red)" />
          </button>
        )}

        <button
          onClick={() => setOpen(o => !o)}
          style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--bg-page)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <ChevronDown size={16} color="var(--gray-400)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>

      {/* Foods */}
      {open && (
        <div>
          {foods.length === 0 ? (
            <p style={{ margin: 0, padding: '14px 16px', fontSize: 13, color: 'var(--gray-400)', fontStyle: 'italic' }}>
              Nenhum alimento — toque em + para adicionar
            </p>
          ) : (
            foods.map((food, i) => (
              <div
                key={food._tempId || food.id || i}
                style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: i < foods.length - 1 ? '1px solid var(--border-light)' : 'none' }}
              >
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: theme.color, flexShrink: 0, marginRight: 11 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--gray-900)' }}>{food.name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-500)' }}>
                    {food.quantity_g}g
                    {food.protein_g > 0 && <> · <span style={{ color: MACRO_COLORS.prot }}>{Math.round(food.protein_g)}g P</span></>}
                    {food.carbs_g   > 0 && <> · <span style={{ color: MACRO_COLORS.carb }}>{Math.round(food.carbs_g)}g C</span></>}
                    {food.fat_g     > 0 && <> · <span style={{ color: MACRO_COLORS.fat }}>{Math.round(food.fat_g)}g G</span></>}
                  </p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: MACRO_COLORS.cal, marginRight: 10, flexShrink: 0 }}>
                  {Math.round(food.calories)} kcal
                </span>
                <button
                  onClick={() => onRemoveFood(food._tempId || food.id)}
                  style={{ width: 26, height: 26, borderRadius: 7, background: '#FEE2E2', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  <X size={12} color="var(--red)" />
                </button>
              </div>
            ))
          )}

          {/* Meal macro summary footer */}
          {foods.length > 0 && (
            <div style={{ display: 'flex', gap: 14, padding: '8px 16px', background: 'var(--bg-page)', borderTop: '1px solid var(--border-light)' }}>
              {[
                { label: 'Prot', value: macros.prot, color: MACRO_COLORS.prot },
                { label: 'Carb', value: macros.carb, color: MACRO_COLORS.carb },
                { label: 'Gord', value: macros.fat,  color: MACRO_COLORS.fat  },
              ].map(m => (
                <span key={m.label} style={{ fontSize: 11, fontWeight: 700, color: m.color }}>
                  {Math.round(m.value)}g <span style={{ color: 'var(--gray-400)', fontWeight: 500 }}>{m.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {showSearch && (
        <FoodSearch
          foods={allFoods}
          onAdd={food => onAddFood(meal._tempId || meal.id, food)}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {children}
    </p>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NutricaoPlanoAluno() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [student,    setStudent]    = useState(null);
  const [allFoods,   setAllFoods]   = useState([]);
  const [plan,       setPlan]       = useState(null);
  const [meals,      setMeals]      = useState([]);
  const [mealFoods,  setMealFoods]  = useState({});
  const [anamnese,   setAnamnese]   = useState(ANAMNESE_INIT);
  const [macroGoals, setMacroGoals] = useState({ calories: '', protein: '', carbs: '', fat: '' });
  const [tab,        setTab]        = useState('plano');
  const [adherence,  setAdherence]  = useState([]);
  const [adhLoading, setAdhLoading] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [planName,   setPlanName]   = useState('Plano Alimentar');
  const [showCalc,   setShowCalc]   = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    load();
  }, [user?.id, id]);

  const load = async () => {
    if (!hasSupabase) { setLoading(false); return; }
    const [{ data: s }, { data: fi }, { data: mp }] = await Promise.all([
      supabase.from('students').select('id, name, color, initials, goal').eq('id', id).maybeSingle(),
      supabase.from('food_items').select('*').eq('personal_id', user.id).order('name'),
      supabase.from('meal_plans').select('*').eq('student_id', id).eq('is_active', true).maybeSingle(),
    ]);
    setStudent(s);
    setAllFoods(fi || []);

    if (mp) {
      setPlan(mp);
      setPlanName(mp.name);
      setMacroGoals({
        calories: mp.goal_calories  != null ? String(mp.goal_calories)  : '',
        protein:  mp.goal_protein_g != null ? String(mp.goal_protein_g) : '',
        carbs:    mp.goal_carbs_g   != null ? String(mp.goal_carbs_g)   : '',
        fat:      mp.goal_fat_g     != null ? String(mp.goal_fat_g)     : '',
      });

      const { data: mm } = await supabase
        .from('meal_plan_meals')
        .select('*, meal_plan_foods(*)')
        .eq('meal_plan_id', mp.id)
        .order('order_index');

      const mealsData = mm || [];
      const tempMeals = mealsData.map(m => ({ ...m, _tempId: m.id }));
      setMeals(tempMeals);
      const foodsMap = {};
      tempMeals.forEach(m => {
        foodsMap[m._tempId] = (m.meal_plan_foods || []).map(f => ({ ...f, _tempId: f.id }));
      });
      setMealFoods(foodsMap);
    } else {
      const tempMeals = DEFAULT_MEALS.map((m, i) => ({ ...m, _tempId: `new_${i}` }));
      setMeals(tempMeals);
      setMealFoods(Object.fromEntries(tempMeals.map(m => [m._tempId, []])));
    }

    const { data: ana } = await supabase.from('nutrition_anamnesis').select('*').eq('student_id', id).maybeSingle();
    if (ana) setAnamnese({ ...ANAMNESE_INIT, ...ana });

    setLoading(false);
  };

  // ── Meal management ──────────────────────────────────────────────────────

  const addFood = (mealTempId, food) => {
    const tempFood = { ...food, _tempId: `food_${Date.now()}_${Math.random()}` };
    setMealFoods(prev => ({ ...prev, [mealTempId]: [...(prev[mealTempId] || []), tempFood] }));
  };

  const removeFood = (mealTempId, foodTempId) => {
    setMealFoods(prev => ({
      ...prev,
      [mealTempId]: (prev[mealTempId] || []).filter(f => (f._tempId || f.id) !== foodTempId),
    }));
  };

  const updateMeal = updatedMeal => {
    setMeals(prev => prev.map(m => m._tempId === updatedMeal._tempId ? updatedMeal : m));
  };

  const addMeal = () => {
    const tempId = `new_${Date.now()}`;
    const newMeal = { name: 'Nova refeição', time_of_day: '', order_index: meals.length, _tempId: tempId };
    setMeals(prev => [...prev, newMeal]);
    setMealFoods(prev => ({ ...prev, [tempId]: [] }));
  };

  const removeMeal = tempId => {
    setMeals(prev => prev.filter(m => m._tempId !== tempId));
    setMealFoods(prev => { const n = { ...prev }; delete n[tempId]; return n; });
  };

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!hasSupabase) return;
    setSaving(true);
    try {
      let planId = plan?.id;

      const planPayload = {
        name:           planName,
        updated_at:     new Date().toISOString(),
        goal_calories:  macroGoals.calories ? Number(macroGoals.calories) : null,
        goal_protein_g: macroGoals.protein  ? Number(macroGoals.protein)  : null,
        goal_carbs_g:   macroGoals.carbs    ? Number(macroGoals.carbs)    : null,
        goal_fat_g:     macroGoals.fat      ? Number(macroGoals.fat)      : null,
      };

      if (planId) {
        await supabase.from('meal_plans').update(planPayload).eq('id', planId);
        await supabase.from('meal_plan_meals').delete().eq('meal_plan_id', planId);
      } else {
        const { data: newPlan } = await supabase.from('meal_plans').insert({
          student_id: id, personal_id: user.id, is_active: true, ...planPayload,
        }).select().single();
        planId = newPlan.id;
        setPlan(newPlan);
      }

      for (const meal of meals) {
        const { data: newMeal } = await supabase.from('meal_plan_meals').insert({
          meal_plan_id: planId,
          name:         meal.name,
          time_of_day:  meal.time_of_day || '',
          order_index:  meal.order_index,
          notes:        meal.notes || null,
        }).select().single();

        const foods = mealFoods[meal._tempId] || [];
        if (foods.length > 0) {
          await supabase.from('meal_plan_foods').insert(
            foods.map((f, i) => ({
              meal_id:      newMeal.id,
              food_item_id: f.food_item_id || null,
              name:         f.name,
              quantity_g:   f.quantity_g,
              calories:     f.calories,
              protein_g:    f.protein_g,
              carbs_g:      f.carbs_g,
              fat_g:        f.fat_g,
              order_index:  i,
            })),
          );
        }
      }

      await supabase.from('nutrition_anamnesis').upsert({
        student_id:     id,
        personal_id:    user.id,
        goal:           anamnese.goal          || null,
        allergies:      anamnese.allergies     || null,
        restrictions:   anamnese.restrictions  || null,
        preferences:    anamnese.preferences   || null,
        water_goal_ml:  Number(anamnese.water_goal_ml) || 2000,
        notes:          anamnese.notes         || null,
        weight:         anamnese.weight        ? Number(anamnese.weight)  : null,
        height:         anamnese.height        ? Number(anamnese.height)  : null,
        age:            anamnese.age           ? Number(anamnese.age)     : null,
        sex:            anamnese.sex           || 'feminino',
        activity_level: anamnese.activity_level || 'moderado',
        conditions:     anamnese.conditions    || null,
        medications:    anamnese.medications   || null,
        workout_time:   anamnese.workout_time  || null,
        meal_count:     anamnese.meal_count    ? Number(anamnese.meal_count) : 5,
        updated_at:     new Date().toISOString(),
      }, { onConflict: 'student_id' });

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Save error:', err);
    }
    setSaving(false);
  };

  const loadAdherence = async () => {
    if (!hasSupabase || !id) return;
    setAdhLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10);
    const { data: logs } = await supabase
      .from('food_logs').select('date,kcal,protein_g,carbs_g,fat_g')
      .eq('student_id', id).gte('date', start).lte('date', today);

    const byDate = {};
    (logs || []).forEach(l => {
      if (!byDate[l.date]) byDate[l.date] = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
      byDate[l.date].kcal      += l.kcal      || 0;
      byDate[l.date].protein_g += l.protein_g || 0;
      byDate[l.date].carbs_g   += l.carbs_g   || 0;
      byDate[l.date].fat_g     += l.fat_g     || 0;
    });

    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const wd = new Date(d + 'T12:00:00');
      days.push({
        date: d,
        label: wd.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
        ...(byDate[d] || { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }),
        logged: !!byDate[d],
      });
    }
    setAdherence(days);
    setAdhLoading(false);
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const allFoodsList = Object.values(mealFoods).flat();
  const totals       = calcMacros(allFoodsList);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page-padding">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => navigate('/dashboard/nutricao')}
          style={{ width: 36, height: 36, borderRadius: 9, border: '1.5px solid var(--border)', background: 'var(--bg-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <ArrowLeft size={17} color="var(--gray-600)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--gray-900)', letterSpacing: '-0.3px' }}>
            Nutrição — {student?.name || '...'}
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--gray-400)' }}>Plano alimentar personalizado</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
          style={{ gap: 6, opacity: saving ? 0.7 : 1, flexShrink: 0 }}
        >
          {saved ? <><Check size={15} /> Salvo!</> : saving ? 'Salvando...' : <><Save size={15} /> Salvar</>}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-page)', borderRadius: 10, padding: 4, border: '1px solid var(--border-light)' }}>
        {[{ key: 'plano', label: 'Plano' }, { key: 'anamnese', label: 'Dados do Aluno' }, { key: 'aderencia', label: 'Aderência' }].map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); if (t.key === 'aderencia' && !adherence.length) loadAdherence(); }}
            style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.key ? 700 : 500, background: tab === t.key ? 'var(--bg-surface)' : 'transparent', color: tab === t.key ? 'var(--accent-text)' : 'var(--gray-500)', boxShadow: tab === t.key ? 'var(--shadow-xs)' : 'none', transition: 'all 0.15s' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PLANO TAB ──────────────────────────────────────────────────────── */}
      {tab === 'plano' && (
        <>
          {/* Allergy warning */}
          {anamnese.allergies && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, marginBottom: 14 }}>
              <AlertCircle size={16} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Alergias / Restrições</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--gray-600)' }}>{anamnese.allergies}</p>
              </div>
            </div>
          )}

          {/* ── Summary card (MyFitnessPal style) ─────────────────────── */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 16, padding: '18px 20px', border: '1px solid var(--border)', marginBottom: 14 }}>

            {/* Plan name + auto-calc button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <input
                value={planName}
                onChange={e => setPlanName(e.target.value)}
                style={{ flex: 1, fontSize: 15, fontWeight: 800, color: 'var(--gray-900)', border: 'none', background: 'transparent', outline: 'none', boxShadow: 'none' }}
                placeholder="Nome do plano"
              />
              <button
                onClick={() => setShowCalc(s => !s)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8, border: `1.5px solid ${showCalc ? 'var(--accent)' : 'var(--border)'}`, background: showCalc ? 'var(--accent-bg)' : 'var(--bg-page)', color: showCalc ? 'var(--accent-text)' : 'var(--gray-500)', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
              >
                <Calculator size={13} /> Auto-calcular
              </button>
            </div>

            {/* Inline calculator */}
            {showCalc && (
              <QuickCalcPanel
                anamnese={anamnese}
                onApply={m => {
                  setMacroGoals({ calories: String(m.calories), protein: String(m.protein), carbs: String(m.carbs), fat: String(m.fat) });
                  setAnamnese(a => ({ ...a, weight: a.weight || String(m.weight || ''), activity_level: a.activity_level }));
                }}
                onClose={() => setShowCalc(false)}
              />
            )}

            {/* Calorie ring + macro bars */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <CalorieRing consumed={totals.cal} goal={macroGoals.calories ? Number(macroGoals.calories) : 0} />

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <MacroBar
                  label="Proteína"
                  value={totals.prot}
                  goal={macroGoals.protein ? Number(macroGoals.protein) : 0}
                  color={MACRO_COLORS.prot}
                  onGoalChange={v => setMacroGoals(p => ({ ...p, protein: v }))}
                />
                <MacroBar
                  label="Carboidratos"
                  value={totals.carb}
                  goal={macroGoals.carbs ? Number(macroGoals.carbs) : 0}
                  color={MACRO_COLORS.carb}
                  onGoalChange={v => setMacroGoals(p => ({ ...p, carbs: v }))}
                />
                <MacroBar
                  label="Gordura"
                  value={totals.fat}
                  goal={macroGoals.fat ? Number(macroGoals.fat) : 0}
                  color={MACRO_COLORS.fat}
                  onGoalChange={v => setMacroGoals(p => ({ ...p, fat: v }))}
                />
              </div>
            </div>

            {/* Calorie goal row */}
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
              <Target size={13} color="var(--gray-400)" />
              <span style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 600 }}>Meta de calorias:</span>
              <input
                type="number"
                value={macroGoals.calories}
                onChange={e => setMacroGoals(p => ({ ...p, calories: e.target.value }))}
                placeholder="ex: 2000"
                style={{ width: 80, fontSize: 13, fontWeight: 700, textAlign: 'center', color: MACRO_COLORS.cal, border: `1.5px solid ${MACRO_COLORS.cal}40`, borderRadius: 7, background: MACRO_COLORS.cal + '08', padding: '4px 6px', boxShadow: 'none' }}
              />
              <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>kcal/dia</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--gray-900)', marginLeft: 'auto' }}>
                Total: <span style={{ color: MACRO_COLORS.cal }}>{Math.round(totals.cal)}</span> kcal
              </span>
            </div>
          </div>

          {/* ── Meals ─────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {meals.map(meal => (
              <MealCard
                key={meal._tempId}
                meal={meal}
                foods={mealFoods[meal._tempId] || []}
                allFoods={allFoods}
                onAddFood={addFood}
                onRemoveFood={foodId => removeFood(meal._tempId, foodId)}
                onUpdateMeal={updateMeal}
                onDelete={() => removeMeal(meal._tempId)}
              />
            ))}
            <button
              onClick={addMeal}
              style={{ padding: '14px', borderRadius: 12, border: '2px dashed var(--border)', background: 'transparent', color: 'var(--gray-400)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'border-color 0.15s' }}
            >
              <Plus size={16} /> Adicionar refeição
            </button>
          </div>
        </>
      )}

      {/* ── ADERÊNCIA TAB ─────────────────────────────────────────────────── */}
      {tab === 'aderencia' && (
        <div>
          {adhLoading ? (
            <div className="loading-screen"><div className="spinner" /></div>
          ) : (
            <>
              {adherence.length > 0 && (() => {
                const loggedDays = adherence.filter(d => d.logged).length;
                const total = adherence.length;
                const pct = Math.round((loggedDays / total) * 100);
                const avgKcal = loggedDays > 0 ? Math.round(adherence.filter(d => d.logged).reduce((s, d) => s + d.kcal, 0) / loggedDays) : 0;
                return (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    {[
                      { label: 'Aderência',   value: `${pct}%`,         sub: `${loggedDays}/${total} dias` },
                      { label: 'Média kcal',  value: avgKcal,           sub: macroGoals.calories ? `meta: ${macroGoals.calories}` : 'sem meta' },
                      { label: 'Dias sem log', value: total - loggedDays, sub: 'últimos 14 dias' },
                    ].map(s => (
                      <div key={s.label} className="kpi-card" style={{ flex: 1, cursor: 'default', padding: '12px 10px', textAlign: 'center' }}>
                        <p className="kpi-card-value" style={{ fontSize: 20 }}>{s.value}</p>
                        <p className="kpi-card-label">{s.label}</p>
                        <p style={{ margin: 0, fontSize: 10, color: 'var(--gray-400)' }}>{s.sub}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {macroGoals.calories && (
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                  <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Calorias vs Meta ({macroGoals.calories} kcal)
                  </p>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
                    {adherence.map(d => {
                      const pct = macroGoals.calories ? Math.min(100, Math.round((d.kcal / Number(macroGoals.calories)) * 100)) : 0;
                      const over = d.kcal > Number(macroGoals.calories);
                      const isToday = d.date === new Date().toISOString().slice(0, 10);
                      return (
                        <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }} title={`${d.label}: ${Math.round(d.kcal)} kcal`}>
                          <div style={{ width: '100%', height: `${Math.max(2, pct)}%`, background: !d.logged ? 'var(--border)' : over ? 'var(--red)' : 'var(--accent)', borderRadius: '3px 3px 0 0', opacity: isToday ? 1 : 0.7 }} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    {adherence.map(d => {
                      const isToday = d.date === new Date().toISOString().slice(0, 10);
                      return (
                        <div key={d.date} style={{ flex: 1, textAlign: 'center', fontSize: 8, color: isToday ? 'var(--accent)' : 'var(--gray-400)', fontWeight: isToday ? 800 : 500, overflow: 'hidden' }}>
                          {d.label.split(',')[0]}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...adherence].reverse().map(d => {
                  const isToday = d.date === new Date().toISOString().slice(0, 10);
                  const kcalGoal = macroGoals.calories ? Number(macroGoals.calories) : null;
                  const pct = kcalGoal && d.logged ? Math.min(100, Math.round((d.kcal / kcalGoal) * 100)) : null;
                  const over = kcalGoal && d.kcal > kcalGoal;
                  return (
                    <div key={d.date} style={{ background: 'var(--bg-surface)', border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 12, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: d.logged ? 8 : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: isToday ? 'var(--accent)' : 'var(--gray-600)', textTransform: 'capitalize' }}>{d.label}</span>
                          {isToday && <span style={{ fontSize: 10, background: 'var(--accent)', color: 'white', borderRadius: 20, padding: '1px 6px', fontWeight: 700 }}>hoje</span>}
                        </div>
                        {d.logged ? (
                          <span style={{ fontSize: 13, fontWeight: 800, color: over ? 'var(--red)' : 'var(--gray-900)' }}>
                            {Math.round(d.kcal)} kcal
                            {kcalGoal && <span style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 500 }}> / {kcalGoal}</span>}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic' }}>sem registro</span>
                        )}
                      </div>
                      {d.logged && (
                        <>
                          {pct !== null && (
                            <div style={{ height: 4, borderRadius: 99, background: 'var(--border)', overflow: 'hidden', marginBottom: 6 }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: over ? 'var(--red)' : 'var(--accent)', borderRadius: 99 }} />
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 10 }}>
                            {[
                              { label: 'P', value: Math.round(d.protein_g), color: '#6366F1' },
                              { label: 'C', value: Math.round(d.carbs_g),   color: '#F59E0B' },
                              { label: 'G', value: Math.round(d.fat_g),     color: '#10B981' },
                            ].map(m => (
                              <span key={m.label} style={{ fontSize: 11, color: m.color, fontWeight: 700 }}>
                                {m.label}: {m.value}g
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── DADOS DO ALUNO TAB (ex-Anamnese) ──────────────────────────────── */}
      {tab === 'anamnese' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Dados Físicos */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border)', padding: 20 }}>
            <SectionTitle>Dados Físicos</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              <div>
                <label>Peso atual (kg)</label>
                <input type="number" min="0" step="0.1" value={anamnese.weight} onChange={e => setAnamnese(a => ({ ...a, weight: e.target.value }))} placeholder="Ex: 72.5" />
              </div>
              <div>
                <label>Altura (cm)</label>
                <input type="number" min="0" step="1" value={anamnese.height} onChange={e => setAnamnese(a => ({ ...a, height: e.target.value }))} placeholder="Ex: 168" />
              </div>
              <div>
                <label>Idade</label>
                <input type="number" min="0" step="1" value={anamnese.age} onChange={e => setAnamnese(a => ({ ...a, age: e.target.value }))} placeholder="Ex: 28" />
              </div>
              <div>
                <label>Sexo</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {['feminino', 'masculino'].map(s => (
                    <button
                      key={s}
                      onClick={() => setAnamnese(a => ({ ...a, sex: s }))}
                      style={{ flex: 1, padding: '7px 10px', borderRadius: 9, border: `1.5px solid ${anamnese.sex === s ? 'var(--accent)' : 'var(--border)'}`, background: anamnese.sex === s ? 'var(--accent-bg)' : 'var(--bg-surface)', color: anamnese.sex === s ? 'var(--accent-text)' : 'var(--gray-600)', fontSize: 13, fontWeight: anamnese.sex === s ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize' }}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Nível de Atividade */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border)', padding: 20 }}>
            <SectionTitle>Nível de Atividade</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ACTIVITY_LEVELS.map(a => (
                <button
                  key={a.key}
                  onClick={() => setAnamnese(prev => ({ ...prev, activity_level: a.key }))}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderRadius: 11, border: `1.5px solid ${anamnese.activity_level === a.key ? 'var(--accent)' : 'var(--border)'}`, background: anamnese.activity_level === a.key ? 'var(--accent-bg)' : 'var(--bg-surface)', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: anamnese.activity_level === a.key ? 'var(--accent-text)' : 'var(--gray-900)' }}>{a.label}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)' }}>{a.sub}</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: anamnese.activity_level === a.key ? 'var(--accent-text)' : 'var(--gray-400)', background: anamnese.activity_level === a.key ? 'rgba(0,0,0,0.06)' : 'var(--bg-page)', padding: '3px 8px', borderRadius: 6 }}>
                    x{a.factor}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Alimentação */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SectionTitle>Alimentação</SectionTitle>
            <div>
              <label>Objetivo nutricional</label>
              <input value={anamnese.goal} onChange={e => setAnamnese(a => ({ ...a, goal: e.target.value }))} placeholder="Ex: Emagrecimento, ganho de massa..." />
            </div>
            <div>
              <label>Alergias alimentares</label>
              <textarea value={anamnese.allergies} onChange={e => setAnamnese(a => ({ ...a, allergies: e.target.value }))} placeholder="Ex: Intolerância a lactose, alergia a amendoim..." rows={2} style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label>Restrições alimentares</label>
              <textarea value={anamnese.restrictions} onChange={e => setAnamnese(a => ({ ...a, restrictions: e.target.value }))} placeholder="Ex: Vegetariano, sem glúten..." rows={2} style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label>Preferências / Alimentos favoritos</label>
              <textarea value={anamnese.preferences} onChange={e => setAnamnese(a => ({ ...a, preferences: e.target.value }))} placeholder="Ex: Prefere frango, gosta de ovos..." rows={2} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label>Horário de treino</label>
                <input value={anamnese.workout_time} onChange={e => setAnamnese(a => ({ ...a, workout_time: e.target.value }))} placeholder="Ex: Manhã, 6h30" />
              </div>
              <div>
                <label>Nº de refeições/dia</label>
                <input type="number" min="2" max="10" value={anamnese.meal_count} onChange={e => setAnamnese(a => ({ ...a, meal_count: Number(e.target.value) }))} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Droplets size={16} color="#3B82F6" />
              <label style={{ margin: 0, flex: 1 }}>Meta de água diária</label>
              <input type="number" min="500" step="100" value={anamnese.water_goal_ml} onChange={e => setAnamnese(a => ({ ...a, water_goal_ml: Number(e.target.value) }))} style={{ width: 100 }} />
              <span style={{ fontSize: 13, color: 'var(--gray-400)', fontWeight: 600 }}>ml</span>
            </div>
          </div>

          {/* Saúde */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SectionTitle>Saúde</SectionTitle>
            <div>
              <label>Doenças / condições</label>
              <textarea value={anamnese.conditions} onChange={e => setAnamnese(a => ({ ...a, conditions: e.target.value }))} placeholder="Ex: Diabetes tipo 2, hipertensão..." rows={2} style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label>Medicamentos relevantes</label>
              <textarea value={anamnese.medications} onChange={e => setAnamnese(a => ({ ...a, medications: e.target.value }))} placeholder="Ex: Metformina 850mg, Losartana..." rows={2} style={{ resize: 'vertical' }} />
            </div>
          </div>

          {/* Observações gerais */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border)', padding: 20 }}>
            <SectionTitle>Observações gerais</SectionTitle>
            <textarea
              value={anamnese.notes}
              onChange={e => setAnamnese(a => ({ ...a, notes: e.target.value }))}
              placeholder="Outras informações relevantes sobre o aluno..."
              rows={4}
              style={{ resize: 'vertical', width: '100%' }}
            />
          </div>

          <div style={{ paddingBottom: 20 }} />
        </div>
      )}
    </div>
  );
}
