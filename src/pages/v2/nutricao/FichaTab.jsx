import { ACTIVITY_LEVELS } from './nutricaoData';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none focus:border-brand-500";

export default function FichaTab({ anamnese, onChange }) {
  const set = (k, v) => onChange({ ...anamnese, [k]: v });

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div className="bg-white border border-ink-100 rounded-xl p-4">
        <p className="text-[13px] font-bold text-ink-900 mb-3">Dados físicos</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Peso (kg)"><input type="number" value={anamnese.weight} onChange={(e) => set('weight', e.target.value)} className={inputCls} /></Field>
          <Field label="Altura (cm)"><input type="number" value={anamnese.height} onChange={(e) => set('height', e.target.value)} className={inputCls} /></Field>
          <Field label="Idade"><input type="number" value={anamnese.age} onChange={(e) => set('age', e.target.value)} className={inputCls} /></Field>
          <Field label="Sexo">
            <select value={anamnese.sex} onChange={(e) => set('sex', e.target.value)} className={inputCls}>
              <option value="feminino">Feminino</option>
              <option value="masculino">Masculino</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="bg-white border border-ink-100 rounded-xl p-4">
        <p className="text-[13px] font-bold text-ink-900 mb-3">Atividade e objetivo</p>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">Nível de atividade</label>
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITY_LEVELS.map(a => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => set('activity_level', a.key)}
                  title={a.sub}
                  className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold border ${
                    anamnese.activity_level === a.key ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-ink-200 text-ink-600'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          <Field label="Objetivo"><input value={anamnese.goal} onChange={(e) => set('goal', e.target.value)} placeholder="Ex: emagrecimento, ganho de massa..." className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Refeições por dia"><input type="number" value={anamnese.meal_count} onChange={(e) => set('meal_count', e.target.value)} className={inputCls} /></Field>
            <Field label="Meta de água (ml)"><input type="number" value={anamnese.water_goal_ml} onChange={(e) => set('water_goal_ml', e.target.value)} className={inputCls} /></Field>
          </div>
          <Field label="Horário de treino"><input value={anamnese.workout_time} onChange={(e) => set('workout_time', e.target.value)} placeholder="Ex: manhã, antes do trabalho..." className={inputCls} /></Field>
        </div>
      </div>

      <div className="bg-white border border-ink-100 rounded-xl p-4">
        <p className="text-[13px] font-bold text-ink-900 mb-3">Saúde e restrições</p>
        <div className="flex flex-col gap-3">
          <Field label="Alergias"><textarea rows={2} value={anamnese.allergies} onChange={(e) => set('allergies', e.target.value)} placeholder="Ex: lactose, amendoim..." className={inputCls} /></Field>
          <Field label="Restrições alimentares"><textarea rows={2} value={anamnese.restrictions} onChange={(e) => set('restrictions', e.target.value)} placeholder="Ex: vegetariano, sem glúten..." className={inputCls} /></Field>
          <Field label="Preferências"><textarea rows={2} value={anamnese.preferences} onChange={(e) => set('preferences', e.target.value)} className={inputCls} /></Field>
          <Field label="Condições de saúde"><textarea rows={2} value={anamnese.conditions} onChange={(e) => set('conditions', e.target.value)} placeholder="Ex: diabetes, hipertensão..." className={inputCls} /></Field>
          <Field label="Medicamentos"><textarea rows={2} value={anamnese.medications} onChange={(e) => set('medications', e.target.value)} className={inputCls} /></Field>
        </div>
      </div>

      <div className="bg-white border border-ink-100 rounded-xl p-4">
        <p className="text-[13px] font-bold text-ink-900 mb-3">Observações</p>
        <textarea rows={3} value={anamnese.notes} onChange={(e) => set('notes', e.target.value)} className={inputCls} />
      </div>
    </div>
  );
}
