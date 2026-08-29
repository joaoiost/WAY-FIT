import { useState } from 'react';
import { Plus, Trash2, Calculator, Check, X } from 'lucide-react';
import FoodPicker from './FoodPicker';
import {
  MACRO_COLORS, ACTIVITY_LEVELS, GOALS_TMB,
  calcMacros, calcTMB, calcSuggestedMacros,
} from './nutricaoData';

function MacroGoalCard({ label, value, goal, color }) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color }}>{label}</span>
        <span className="text-[11.5px] text-ink-500">
          <strong className="text-ink-900">{Math.round(value)}</strong>{goal > 0 && `/${goal}`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function Calculator_({ anamnese, onApply, onClose }) {
  const [form, setForm] = useState({
    weight: anamnese.weight || '', height: anamnese.height || '', age: anamnese.age || '',
    sex: anamnese.sex || 'feminino', activity: anamnese.activity_level || 'moderado', goal: 'manutencao',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const tmb = calcTMB(form.weight, form.height, form.age, form.sex);
  const factor = ACTIVITY_LEVELS.find(a => a.key === form.activity)?.factor || 1.55;
  const tdee = tmb ? Math.round(tmb * factor) : null;
  const suggested = tdee ? calcSuggestedMacros(tdee, form.weight, form.goal) : null;

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-[13px] font-bold text-ink-900">
          <Calculator size={14} className="text-brand-600" /> Calcular metas automaticamente
        </div>
        <button onClick={onClose} className="text-ink-400 hover:text-ink-600"><X size={15} /></button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {[{ k: 'weight', l: 'Peso (kg)' }, { k: 'height', l: 'Altura (cm)' }, { k: 'age', l: 'Idade' }].map(f => (
          <div key={f.k}>
            <label className="block text-[10px] font-semibold text-ink-500 mb-1">{f.l}</label>
            <input type="number" value={form[f.k]} onChange={(e) => set(f.k, e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg border border-ink-200 text-center text-sm font-semibold text-ink-900 outline-none focus:border-brand-500" />
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 mb-3">
        {['feminino', 'masculino'].map(s => (
          <button key={s} onClick={() => set('sex', s)}
            className={`flex-1 py-1.5 rounded-lg text-[12px] font-semibold capitalize border ${form.sex === s ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-ink-200 text-ink-500'}`}>
            {s}
          </button>
        ))}
      </div>

      <p className="text-[10px] font-semibold text-ink-500 mb-1.5">Nível de atividade</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {ACTIVITY_LEVELS.map(a => (
          <button key={a.key} onClick={() => set('activity', a.key)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${form.activity === a.key ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-ink-200 text-ink-500'}`}>
            {a.label}
          </button>
        ))}
      </div>

      <p className="text-[10px] font-semibold text-ink-500 mb-1.5">Objetivo</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {GOALS_TMB.map(g => (
          <button key={g.key} onClick={() => set('goal', g.key)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${form.goal === g.key ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-ink-200 text-ink-500'}`}>
            {g.label}
          </button>
        ))}
      </div>

      {suggested ? (
        <>
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {[
              { l: 'Kcal', v: suggested.calories, c: MACRO_COLORS.cal },
              { l: 'Prot', v: suggested.protein + 'g', c: MACRO_COLORS.prot },
              { l: 'Carb', v: suggested.carbs + 'g', c: MACRO_COLORS.carb },
              { l: 'Gord', v: suggested.fat + 'g', c: MACRO_COLORS.fat },
            ].map(m => (
              <div key={m.l} className="text-center py-2 rounded-lg" style={{ background: m.c + '14' }}>
                <p className="m-0 text-[14px] font-extrabold" style={{ color: m.c }}>{m.v}</p>
                <p className="m-0 text-[9px] font-bold uppercase" style={{ color: m.c }}>{m.l}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-[11px] text-ink-400 mb-2.5">TMB: {Math.round(tmb)} kcal · TDEE: {tdee} kcal</p>
          <button onClick={() => { onApply(suggested); onClose(); }} className="w-full py-2 rounded-lg bg-brand-600 text-white text-[13px] font-semibold flex items-center justify-center gap-1.5">
            <Check size={14} /> Aplicar estas metas ao plano
          </button>
        </>
      ) : (
        <p className="text-center text-[12px] text-ink-400 py-2">Preencha peso, altura e idade pra calcular.</p>
      )}
    </div>
  );
}

export default function PlanoTab({ planName, setPlanName, macroGoals, setMacroGoals, meals, mealFoods, anamnese, allFoods, onAddMeal, onRemoveMeal, onUpdateMeal, onAddFood, onRemoveFood }) {
  const [showCalc, setShowCalc] = useState(false);
  const [pickerFor, setPickerFor] = useState(null);

  const allFoodsList = Object.values(mealFoods).flat();
  const totals = calcMacros(allFoodsList);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-semibold text-ink-700 mb-1.5">Nome do plano</label>
        <input value={planName} onChange={(e) => setPlanName(e.target.value)}
          className="w-full max-w-sm px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none focus:border-brand-500" />
      </div>

      <div className="bg-white border border-ink-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-bold text-ink-900">Metas diárias</p>
          <button onClick={() => setShowCalc(v => !v)} className="text-[12px] font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
            <Calculator size={13} /> Calcular
          </button>
        </div>

        {showCalc && (
          <Calculator_
            anamnese={anamnese}
            onClose={() => setShowCalc(false)}
            onApply={(s) => setMacroGoals({ calories: String(s.calories), protein: String(s.protein), carbs: String(s.carbs), fat: String(s.fat) })}
          />
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MacroGoalCard label="Kcal" value={totals.cal} goal={Number(macroGoals.calories) || 0} color={MACRO_COLORS.cal} />
          <MacroGoalCard label="Proteína" value={totals.prot} goal={Number(macroGoals.protein) || 0} color={MACRO_COLORS.prot} />
          <MacroGoalCard label="Carbo" value={totals.carb} goal={Number(macroGoals.carbs) || 0} color={MACRO_COLORS.carb} />
          <MacroGoalCard label="Gordura" value={totals.fat} goal={Number(macroGoals.fat) || 0} color={MACRO_COLORS.fat} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {meals.map(meal => {
          const foods = mealFoods[meal._tempId] || [];
          const mTotals = calcMacros(foods);
          return (
            <div key={meal._tempId} className="bg-white border border-ink-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  value={meal.name}
                  onChange={(e) => onUpdateMeal({ ...meal, name: e.target.value })}
                  className="flex-1 min-w-0 text-[14px] font-bold text-ink-900 outline-none border-none p-0 bg-transparent"
                />
                <input
                  type="time"
                  value={meal.time_of_day || ''}
                  onChange={(e) => onUpdateMeal({ ...meal, time_of_day: e.target.value })}
                  className="w-[92px] px-2 py-1 rounded-md border border-ink-200 text-[12px] text-ink-700 outline-none"
                />
                <span className="text-[11.5px] text-ink-400 shrink-0">{Math.round(mTotals.cal)} kcal</span>
                <button onClick={() => onRemoveMeal(meal._tempId)} className="text-ink-300 hover:text-danger-500 shrink-0"><Trash2 size={14} /></button>
              </div>

              {foods.length > 0 && (
                <div className="flex flex-col gap-1 mb-2">
                  {foods.map(f => (
                    <div key={f._tempId || f.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-ink-50">
                      <span className="flex-1 min-w-0 text-[12.5px] text-ink-800 truncate">{f.name}</span>
                      <span className="text-[11px] text-ink-400 shrink-0">{f.quantity_g}g · {Math.round(f.calories)}kcal</span>
                      <button onClick={() => onRemoveFood(meal._tempId, f._tempId || f.id)} className="text-ink-300 hover:text-danger-500 shrink-0">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setPickerFor(meal._tempId)}
                className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-600 hover:text-brand-700"
              >
                <Plus size={13} /> Adicionar alimento
              </button>
            </div>
          );
        })}

        <button onClick={onAddMeal} className="self-start flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 hover:text-ink-700">
          <Plus size={14} /> Adicionar refeição
        </button>
      </div>

      <FoodPicker
        isOpen={!!pickerFor}
        onClose={() => setPickerFor(null)}
        customFoods={allFoods}
        allergies={anamnese.allergies}
        onAdd={(food) => { onAddFood(pickerFor, food); setPickerFor(null); }}
      />
    </div>
  );
}
