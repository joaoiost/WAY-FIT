import { useState, useEffect } from 'react';
import { Save, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { useScopedLoader } from '../../hooks/useScopedLoader';
import StudentPicker from '../../components/v2/StudentPicker';
import PlanoTab from './nutricao/PlanoTab';
import FichaTab from './nutricao/FichaTab';
import AderenciaTab from './nutricao/AderenciaTab';
import { DEFAULT_MEALS, ANAMNESE_INIT } from './nutricao/nutricaoData';

async function loadStudentNutrition(studentId, personalId) {
  const [{ data: fi }, { data: mp }, { data: ana }] = await Promise.all([
    supabase.from('food_items').select('*').eq('personal_id', personalId).order('name'),
    supabase.from('meal_plans').select('*').eq('student_id', studentId).eq('is_active', true).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('nutrition_anamnesis').select('*').eq('student_id', studentId).maybeSingle(),
  ]);

  let meals = DEFAULT_MEALS.map((m, i) => ({ ...m, _tempId: `new_${i}` }));
  let mealFoods = Object.fromEntries(meals.map(m => [m._tempId, []]));
  let plan = mp || null;
  let macroGoals = { calories: '', protein: '', carbs: '', fat: '' };
  let planName = 'Plano Alimentar';

  if (mp) {
    planName = mp.name;
    macroGoals = {
      calories: mp.goal_calories != null ? String(mp.goal_calories) : '',
      protein: mp.goal_protein_g != null ? String(mp.goal_protein_g) : '',
      carbs: mp.goal_carbs_g != null ? String(mp.goal_carbs_g) : '',
      fat: mp.goal_fat_g != null ? String(mp.goal_fat_g) : '',
    };
    const { data: mm } = await supabase.from('meal_plan_meals').select('*, meal_plan_foods(*)').eq('meal_plan_id', mp.id).order('order_index');
    const mealsData = (mm || []).map(m => ({ ...m, _tempId: m.id }));
    if (mealsData.length) {
      meals = mealsData;
      mealFoods = {};
      mealsData.forEach(m => { mealFoods[m._tempId] = (m.meal_plan_foods || []).map(f => ({ ...f, _tempId: f.id })); });
    }
  }

  // Colunas nulas no banco (ex: nunca preenchidas) não devem virar `value={null}`
  // num input controlado — só sobrescreve o default onde o banco tem valor real.
  const anaClean = ana ? Object.fromEntries(Object.entries(ana).filter(([, v]) => v != null)) : {};

  return {
    allFoods: fi || [],
    plan, planName, macroGoals, meals, mealFoods,
    anamnese: { ...ANAMNESE_INIT, ...anaClean },
  };
}

export default function NutricaoV2() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [selStudent, setSelStudent] = useState(null);
  const [tab, setTab] = useState('plano');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data, loading, setData } = useScopedLoader(selStudent, (id) => loadStudentNutrition(id, user.id));

  useEffect(() => {
    if (!user || !hasSupabase) return;
    supabase.from('students').select('id, name, initials, color').eq('personal_id', user.id).eq('status', 'ativo').order('name')
      .then(({ data: s }) => { setStudents(s || []); if (s?.length) setSelStudent(s[0].id); });
  }, [user?.id]);

  const patch = (fields) => setData(prev => ({ ...prev, ...fields }));

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      let planId = data.plan?.id;
      const planPayload = {
        name: data.planName,
        updated_at: new Date().toISOString(),
        goal_calories: data.macroGoals.calories ? Number(data.macroGoals.calories) : null,
        goal_protein_g: data.macroGoals.protein ? Number(data.macroGoals.protein) : null,
        goal_carbs_g: data.macroGoals.carbs ? Number(data.macroGoals.carbs) : null,
        goal_fat_g: data.macroGoals.fat ? Number(data.macroGoals.fat) : null,
      };

      if (planId) {
        const { error } = await supabase.from('meal_plans').update(planPayload).eq('id', planId);
        if (error) throw error;
        await supabase.from('meal_plan_meals').delete().eq('meal_plan_id', planId);
      } else {
        const { data: newPlan, error } = await supabase.from('meal_plans').insert({
          student_id: selStudent, personal_id: user.id, is_active: true, ...planPayload,
        }).select().single();
        if (error || !newPlan) throw error || new Error('Erro ao criar plano');
        planId = newPlan.id;
      }

      for (const meal of data.meals) {
        const { data: newMeal, error: mealErr } = await supabase.from('meal_plan_meals').insert({
          meal_plan_id: planId, name: meal.name, time_of_day: meal.time_of_day || '', order_index: meal.order_index, notes: meal.notes || null,
        }).select().single();
        if (mealErr || !newMeal) throw mealErr || new Error('Erro ao salvar refeição');
        const foods = data.mealFoods[meal._tempId] || [];
        if (foods.length) {
          const { error: foodErr } = await supabase.from('meal_plan_foods').insert(
            foods.map((f, i) => ({
              meal_id: newMeal.id, food_item_id: f.food_item_id || null, name: f.name, quantity_g: f.quantity_g,
              calories: f.calories, protein_g: f.protein_g, carbs_g: f.carbs_g, fat_g: f.fat_g, order_index: i,
            }))
          );
          if (foodErr) throw foodErr;
        }
      }

      const a = data.anamnese;
      const { error: anaErr } = await supabase.from('nutrition_anamnesis').upsert({
        student_id: selStudent, personal_id: user.id,
        goal: a.goal || null, allergies: a.allergies || null, restrictions: a.restrictions || null, preferences: a.preferences || null,
        water_goal_ml: Number(a.water_goal_ml) || 2000, notes: a.notes || null,
        weight: a.weight ? Number(a.weight) : null, height: a.height ? Number(a.height) : null, age: a.age ? Number(a.age) : null,
        sex: a.sex || 'feminino', activity_level: a.activity_level || 'moderado',
        conditions: a.conditions || null, medications: a.medications || null, workout_time: a.workout_time || null,
        meal_count: a.meal_count ? Number(a.meal_count) : 5, updated_at: new Date().toISOString(),
      }, { onConflict: 'student_id' });
      if (anaErr) throw anaErr;

      const fresh = await loadStudentNutrition(selStudent, user.id);
      setData(fresh);
      toast.success('Plano salvo!');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast.error('Erro ao salvar: ' + (err?.message || 'tente novamente'));
    } finally {
      setSaving(false);
    }
  };

  if (students.length === 0) {
    return (
      <div className="bg-white border border-ink-100 rounded-xl py-16 text-center">
        <p className="text-[14px] font-semibold text-ink-900">Nenhum aluno cadastrado ainda</p>
        <p className="text-[13px] text-ink-500 mt-1">Cadastre um aluno pra montar o plano alimentar dele.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-xs w-full">
          <StudentPicker students={students} value={selStudent} onChange={setSelStudent} placeholder="Escolher aluno..." />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-ink-100 rounded-lg p-1">
            {[['plano', 'Plano'], ['ficha', 'Ficha do aluno'], ['aderencia', 'Aderência']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-3.5 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${tab === key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab !== 'aderencia' && (
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                saved ? 'bg-success-500 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'
              } disabled:opacity-50`}
            >
              {saved ? <><Check size={14} /> Salvo!</> : <><Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}</>}
            </button>
          )}
        </div>
      </div>

      {loading || !data ? (
        <div className="py-16 text-center text-sm text-ink-400">Carregando...</div>
      ) : (
        <>
          {tab === 'plano' && (
            <PlanoTab
              planName={data.planName}
              setPlanName={(v) => patch({ planName: v })}
              macroGoals={data.macroGoals}
              setMacroGoals={(v) => patch({ macroGoals: v })}
              meals={data.meals}
              mealFoods={data.mealFoods}
              anamnese={data.anamnese}
              allFoods={data.allFoods}
              onAddMeal={() => {
                const tempId = `new_${Date.now()}`;
                patch({
                  meals: [...data.meals, { name: 'Nova refeição', time_of_day: '', order_index: data.meals.length, _tempId: tempId }],
                  mealFoods: { ...data.mealFoods, [tempId]: [] },
                });
              }}
              onRemoveMeal={(tempId) => {
                const meals = data.meals.filter(m => m._tempId !== tempId);
                const mealFoods = { ...data.mealFoods };
                delete mealFoods[tempId];
                patch({ meals, mealFoods });
              }}
              onUpdateMeal={(updated) => patch({ meals: data.meals.map(m => m._tempId === updated._tempId ? updated : m) })}
              onAddFood={(mealTempId, food) => {
                const tempFood = { ...food, _tempId: `food_${Date.now()}_${Math.random()}` };
                patch({ mealFoods: { ...data.mealFoods, [mealTempId]: [...(data.mealFoods[mealTempId] || []), tempFood] } });
              }}
              onRemoveFood={(mealTempId, foodTempId) => {
                patch({ mealFoods: { ...data.mealFoods, [mealTempId]: (data.mealFoods[mealTempId] || []).filter(f => (f._tempId || f.id) !== foodTempId) } });
              }}
            />
          )}

          {tab === 'ficha' && (
            <FichaTab anamnese={data.anamnese} onChange={(a) => patch({ anamnese: a })} />
          )}

          {tab === 'aderencia' && (
            <AderenciaTab studentId={selStudent} goalCalories={Number(data.macroGoals.calories) || 0} />
          )}
        </>
      )}
    </div>
  );
}
