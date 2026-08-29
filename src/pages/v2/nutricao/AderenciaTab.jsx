import { useEffect, useState } from 'react';
import { supabase, hasSupabase } from '../../../lib/supabase';
import { todayLocal, toLocalDateStr } from '../../../lib/date';

export default function AderenciaTab({ studentId, goalCalories }) {
  const [days, setDays] = useState(null);

  useEffect(() => {
    if (!hasSupabase || !studentId) return;
    let cancelled = false;
    (async () => {
      const today = todayLocal();
      const start = toLocalDateStr(new Date(Date.now() - 13 * 86400000));
      const { data: logs } = await supabase
        .from('food_logs').select('date,kcal,protein_g,carbs_g,fat_g')
        .eq('student_id', studentId).gte('date', start).lte('date', today);
      if (cancelled) return;

      const byDate = {};
      (logs || []).forEach(l => {
        if (!byDate[l.date]) byDate[l.date] = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
        byDate[l.date].kcal += l.kcal || 0;
        byDate[l.date].protein_g += l.protein_g || 0;
        byDate[l.date].carbs_g += l.carbs_g || 0;
        byDate[l.date].fat_g += l.fat_g || 0;
      });

      const result = [];
      for (let i = 13; i >= 0; i--) {
        const d = toLocalDateStr(new Date(Date.now() - i * 86400000));
        const wd = new Date(d + 'T12:00:00');
        result.push({
          date: d,
          label: wd.toLocaleDateString('pt-BR', { weekday: 'short' }),
          dayNum: wd.getDate(),
          ...(byDate[d] || { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }),
          logged: !!byDate[d],
        });
      }
      setDays(result);
    })();
    return () => { cancelled = true; };
  }, [studentId]);

  if (!days) return <div className="py-16 text-center text-sm text-ink-400">Carregando...</div>;

  const loggedDays = days.filter(d => d.logged);
  if (loggedDays.length === 0) {
    return (
      <div className="bg-white border border-ink-100 rounded-xl py-16 text-center">
        <p className="text-[14px] font-semibold text-ink-900">Nenhum registro nos últimos 14 dias</p>
        <p className="text-[13px] text-ink-500 mt-1">Quando o aluno começar a registrar refeições, a adesão aparece aqui.</p>
      </div>
    );
  }

  const maxKcal = Math.max(...days.map(d => d.kcal), goalCalories || 0, 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-ink-100 rounded-xl p-4">
        <p className="text-[13px] font-bold text-ink-900 mb-4">Calorias — últimos 14 dias</p>
        <div className="flex items-end gap-1.5 h-36">
          {days.map(d => {
            const h = Math.max(2, (d.kcal / maxKcal) * 100);
            const over = goalCalories > 0 && d.kcal > goalCalories;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                <div
                  className={`w-full rounded-t-sm ${!d.logged ? 'bg-ink-100' : over ? 'bg-danger-500' : 'bg-brand-500'}`}
                  style={{ height: `${h}%` }}
                  title={`${d.label} ${d.dayNum}: ${Math.round(d.kcal)} kcal`}
                />
                <span className="text-[9px] text-ink-400 uppercase">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-ink-100 rounded-xl overflow-hidden">
        <div className="grid grid-cols-5 gap-2 px-4 py-2.5 border-b border-ink-100 text-[10.5px] font-bold uppercase text-ink-400">
          <span>Dia</span><span>Kcal</span><span>Prot.</span><span>Carb.</span><span>Gord.</span>
        </div>
        {days.filter(d => d.logged).reverse().map(d => (
          <div key={d.date} className="grid grid-cols-5 gap-2 px-4 py-2 border-b border-ink-50 last:border-0 text-[12.5px] text-ink-800">
            <span className="capitalize">{d.label} {d.dayNum}</span>
            <span>{Math.round(d.kcal)}</span>
            <span>{Math.round(d.protein_g)}g</span>
            <span>{Math.round(d.carbs_g)}g</span>
            <span>{Math.round(d.fat_g)}g</span>
          </div>
        ))}
      </div>
    </div>
  );
}
