import { useState, useMemo } from 'react';
import ModalV2 from '../../../components/v2/Modal';
import StudentPicker from '../../../components/v2/StudentPicker';
import { DAYS, DAY_PRESETS, typeColor } from './treinosData';

// Um diálogo só pra atribuir um modelo de treino a dia(s)/aluno(s) —
// substitui os 3 níveis de janela empilhada (WeekBuilder → TemplateEditor
// → AIModal) que existiam na versão antiga só pra fazer essa tarefa.
//
// - A partir de um modelo (Modelos tab): `template` vem fixo, escolhe aluno(s).
// - A partir do dia de um aluno (aba Atribuir): `fixedStudentId` vem fixo,
//   escolhe o modelo.
export default function AssignDialog({
  isOpen,
  onClose,
  templates,
  students,
  template: fixedTemplate,
  fixedStudentId,
  initialDays = [],
  onConfirm,
}) {
  const [templateId, setTemplateId] = useState(fixedTemplate?.id || '');
  const [studentIds, setStudentIds] = useState(fixedStudentId ? [fixedStudentId] : []);
  const [days, setDays] = useState(initialDays);
  const [saving, setSaving] = useState(false);

  const template = fixedTemplate || templates.find(t => t.id === templateId);
  const toggleDay = (d) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const canConfirm = template && (fixedStudentId || studentIds.length > 0) && days.length > 0;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSaving(true);
    const ids = fixedStudentId ? [fixedStudentId] : studentIds;
    await onConfirm(template, ids, days);
    setSaving(false);
  };

  return (
    <ModalV2
      isOpen={isOpen}
      onClose={onClose}
      title="Atribuir treino"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-ink-500 hover:bg-ink-50">Cancelar</button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || saving}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-40"
          >
            {saving ? 'Atribuindo...' : 'Atribuir'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {fixedTemplate ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-50">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: typeColor(fixedTemplate.type) }} />
            <span className="text-sm font-semibold text-ink-900">{fixedTemplate.name}</span>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">Modelo de treino</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-ink-200 text-sm text-ink-900 outline-none focus:border-brand-500 bg-white"
            >
              <option value="">Selecione...</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}

        {!fixedStudentId && (
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">Aluno(s)</label>
            <StudentPicker students={students} value={studentIds} onChange={setStudentIds} multiple placeholder="Escolher aluno(s)..." />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-ink-700 mb-1.5">Dias da semana</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {DAY_PRESETS.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => setDays(p.days)}
                title={p.sub}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {DAYS.map(d => (
              <button
                key={d.v}
                type="button"
                onClick={() => toggleDay(d.v)}
                className={`flex-1 py-2 rounded-lg text-[12px] font-bold border transition-colors ${
                  days.includes(d.v) ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-ink-200 text-ink-500'
                }`}
              >
                {d.s}
              </button>
            ))}
          </div>
        </div>

        {(fixedStudentId || studentIds.length > 0) && days.length > 0 && (
          <p className="text-[12px] bg-warning-50 border border-warning-500/20 text-ink-700 rounded-lg px-3 py-2">
            Isso substitui qualquer treino já atribuído nos dias selecionados.
          </p>
        )}
      </div>
    </ModalV2>
  );
}
