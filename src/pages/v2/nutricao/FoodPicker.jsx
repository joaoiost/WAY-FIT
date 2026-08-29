import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, AlertTriangle, Plus } from 'lucide-react';
import ModalV2 from '../../../components/v2/Modal';
import tacoFoods from '../../../data/taco_foods.json';
import { matchesAllergyText } from './nutricaoData';

// Buscar + confirmar quantidade numa tela só — a versão antiga exigia
// abrir busca, escolher aba, buscar, selecionar e confirmar quantidade
// numa segunda tela. Aqui a quantidade já vem inline em cada resultado:
// um toque adiciona com 100g, o personal ajusta depois se precisar.
export default function FoodPicker({ isOpen, onClose, customFoods, onAdd, allergies }) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 60); }, [isOpen]);

  const merged = useMemo(() => {
    const customNames = new Set(customFoods.map(f => f.name.toLowerCase()));
    const taco = tacoFoods
      .filter(f => !customNames.has(f.name.toLowerCase()))
      .map(f => ({
        id: `taco_${f.id}`, name: f.name, category: f.category || 'TACO',
        calories_per_100g: f.kcal ?? 0, protein_per_100g: f.protein_g ?? 0,
        carbs_per_100g: f.carbs_g ?? 0, fat_per_100g: f.fat_g ?? 0,
      }));
    return [...customFoods, ...taco];
  }, [customFoods]);

  const results = q.length < 2 ? [] : merged.filter(f => f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 20);

  const handleAdd = (food, qty = 100) => {
    const isTaco = String(food.id).startsWith('taco_');
    onAdd({
      food_item_id: isTaco ? null : food.id,
      name: food.name,
      quantity_g: qty,
      calories: Number(((food.calories_per_100g || 0) * qty / 100).toFixed(1)),
      protein_g: Number(((food.protein_per_100g || 0) * qty / 100).toFixed(1)),
      carbs_g: Number(((food.carbs_per_100g || 0) * qty / 100).toFixed(1)),
      fat_g: Number(((food.fat_per_100g || 0) * qty / 100).toFixed(1)),
      order_index: 0,
    });
  };

  const handleManual = () => {
    if (!q.trim()) return;
    onAdd({ food_item_id: null, name: q.trim(), quantity_g: 100, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, order_index: 0 });
    setQ('');
  };

  return (
    <ModalV2 isOpen={isOpen} onClose={onClose} variant="drawer" title="Adicionar alimento">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Buscar entre ${(tacoFoods.length + customFoods.length).toLocaleString()} alimentos...`}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none focus:border-brand-500"
          />
        </div>

        {q.length >= 2 && results.length === 0 && (
          <button
            onClick={handleManual}
            className="flex items-center gap-2 px-3.5 py-3 rounded-lg border border-dashed border-ink-200 text-ink-600 text-[13px] hover:border-brand-300 hover:bg-brand-50/40"
          >
            <Plus size={14} /> Adicionar "{q}" manualmente (sem tabela nutricional)
          </button>
        )}

        <div className="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto">
          {results.map(f => {
            const allergyHit = matchesAllergyText(f.name, allergies);
            return (
              <button
                key={f.id}
                onClick={() => handleAdd(f)}
                className="w-full text-left px-3.5 py-2.5 rounded-lg border border-ink-100 hover:border-brand-300 hover:bg-brand-50/40 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-ink-900 truncate">{f.name}</p>
                  <p className="text-[11.5px] text-ink-400">
                    {Math.round(f.calories_per_100g || 0)} kcal /100g
                    {allergyHit && (
                      <span className="ml-2 inline-flex items-center gap-1 text-warning-500 font-semibold">
                        <AlertTriangle size={11} /> possível alergia
                      </span>
                    )}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-semibold text-brand-600 bg-brand-50 rounded-full px-2 py-1">+100g</span>
              </button>
            );
          })}
        </div>
      </div>
    </ModalV2>
  );
}
