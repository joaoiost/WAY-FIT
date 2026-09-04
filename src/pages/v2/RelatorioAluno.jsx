import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { todayLocal, toLocalDateStr } from '../../lib/date';

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: white; }

  .report { max-width: 210mm; margin: 0 auto; padding: 12mm 16mm; color: #0F172A; }

  .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #F1F5F9; }
  .logo-area { display: flex; align-items: center; gap: 10px; }
  .logo-box { width: 40px; height: 40px; border-radius: 10px; background: #4F46E5; display: flex; align-items: center; justify-content: center; }
  .logo-zap { font-size: 14px; color: white; font-weight: 900; letter-spacing: -0.5px; }
  .logo-name { font-size: 22px; font-weight: 900; color: #0F172A; }
  .logo-sub { font-size: 11px; color: #94A3B8; font-weight: 500; margin-top: 2px; }
  .header-date { text-align: right; }
  .header-date p { font-size: 12px; color: #64748B; }
  .header-date strong { font-size: 13px; color: #0F172A; }

  .student-card { background: #F8FAFC; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 16px; }
  .avatar { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 900; color: white; flex-shrink: 0; }
  .student-info h2 { font-size: 20px; font-weight: 900; color: #0F172A; }
  .student-info p { font-size: 13px; color: #64748B; margin-top: 2px; }
  .goal-badge { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg,#4F46E5,#7C3AED); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 6px; }

  .section { margin-bottom: 24px; }
  .section-title { font-size: 13px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .section-title::after { content: ''; flex: 1; height: 1px; background: #F1F5F9; }

  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .stat-box { background: white; border: 1px solid #F1F5F9; border-radius: 10px; padding: 14px 12px; text-align: center; }
  .stat-value { font-size: 26px; font-weight: 900; line-height: 1; }
  .stat-label { font-size: 11px; color: #94A3B8; font-weight: 500; margin-top: 4px; line-height: 1.3; white-space: pre-line; }

  .progress-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .measure-box { background: #F8FAFC; border-radius: 10px; padding: 12px; text-align: center; }
  .measure-val { font-size: 22px; font-weight: 900; color: #0F172A; }
  .measure-unit { font-size: 11px; color: #94A3B8; }
  .measure-diff { font-size: 12px; font-weight: 700; margin-top: 4px; }
  .measure-label { font-size: 11px; color: #64748B; margin-top: 2px; }

  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead tr { background: #F8FAFC; }
  th { padding: 9px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.04em; }
  td { padding: 10px 12px; border-bottom: 1px solid #F8FAFC; color: #334155; }
  tr:last-child td { border-bottom: none; }
  .ex-up { color: #059669; font-weight: 700; }
  .ex-down { color: #DC2626; font-weight: 700; }

  .week-row { display: flex; gap: 6px; margin-bottom: 4px; }
  .week-dot { width: 18px; height: 18px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; }
  .week-dot.done { background: #059669; color: white; }
  .week-dot.miss { background: #E2E8F0; color: #94A3B8; }

  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #F1F5F9; display: flex; align-items: center; justify-content: space-between; }
  .footer p { font-size: 11px; color: #94A3B8; }
  .footer .signature { font-size: 13px; font-weight: 700; color: #334155; }

  .no-print { margin-bottom: 20px; }

  @media print {
    .no-print { display: none !important; }
    .report { padding: 10mm 14mm; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

function avatarColor(id) {
  const COLORS = ['#4F46E5', '#059669', '#7C3AED', '#D97706', '#DC2626', '#DB2777', '#0891B2'];
  return COLORS[(id?.charCodeAt(0) || 0) % COLORS.length];
}

function diff(a, b, unit = '') {
  if (a == null || b == null) return null;
  const d = (b - a).toFixed(1);
  const sign = d > 0 ? '+' : '';
  return `${sign}${d}${unit}`;
}

export default function RelatorioAlunoV2() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const ninetyDaysAgo = toLocalDateStr(new Date(Date.now() - 90 * 86400000));
  const today = todayLocal();
  const thisMonth = today.slice(0, 7);

  useEffect(() => {
    if (!user || !id || !hasSupabase) { setLoading(false); return; }
    (async () => {
      try {
        const [{ data: student }, { data: sessions }, { data: measurements }, { data: exLogs }] = await Promise.all([
          supabase.from('students').select('*').eq('id', id).eq('personal_id', user.id).single(),
          supabase.from('workout_sessions').select('date, plan_name, exercises_done, exercises_total, finished_at').eq('student_id', id).gte('date', ninetyDaysAgo).order('date'),
          supabase.from('student_measurements').select('*').eq('student_id', id).order('recorded_at'),
          supabase.from('exercise_logs').select('exercise_name, load_actual, done, created_at').eq('student_id', id).not('load_actual', 'is', null).order('created_at').limit(200),
        ]);
        if (!student) { setError('Aluno não encontrado.'); setLoading(false); return; }
        setData({ student, sessions: sessions || [], measurements: measurements || [], exLogs: exLogs || [] });
        setLoading(false);
      } catch {
        setError('Erro ao carregar dados.');
        setLoading(false);
      }
    })();
  }, [user?.id, id]);

  if (loading) return (
    <div className="bg-white" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 12, colorScheme: 'light' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #E2E8F0', borderTopColor: '#4F46E5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#64748B', fontSize: 14 }}>Preparando relatório...</p>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !data) return (
    <div className="bg-white" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 12, colorScheme: 'light' }}>
      <p style={{ color: '#DC2626' }}>{error || 'Sem dados.'}</p>
      <button onClick={() => navigate(-1)} style={{ padding: '8px 16px', background: '#4F46E5', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Voltar</button>
    </div>
  );

  const { student, sessions, measurements, exLogs } = data;

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.exercises_total > 0 && s.exercises_done >= s.exercises_total).length;
  const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
  const thisMonthSessions = sessions.filter(s => s.date.startsWith(thisMonth)).length;

  const firstM = measurements[0];
  const lastM = measurements[measurements.length - 1];

  const byExercise = {};
  exLogs.forEach(log => {
    if (!log.done || !log.load_actual) return;
    const n = log.exercise_name;
    if (!byExercise[n]) byExercise[n] = [];
    byExercise[n].push({ load: parseFloat(log.load_actual), date: log.created_at?.slice(0, 10) });
  });
  const exerciseProgression = Object.entries(byExercise)
    .map(([name, entries]) => {
      const sorted = entries.sort((a, b) => a.date?.localeCompare(b.date));
      return { name, first: sorted[0]?.load, last: sorted[sorted.length - 1]?.load, sessions: sorted.length };
    })
    .filter(e => e.sessions >= 2 && e.first !== e.last)
    .sort((a, b) => (b.last - b.first) - (a.last - a.first))
    .slice(0, 8);

  const last4Weeks = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    return toLocalDateStr(d);
  });
  const sessionDates = new Set(sessions.map(s => s.date));

  const color = student.color || avatarColor(student.id);
  const initials = student.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const personalName = user?.name || 'Personal Trainer';

  return (
    <div className="bg-white" style={{ minHeight: '100vh', colorScheme: 'light' }}>
      <style>{CSS}</style>
      <div className="report">
        <div className="no-print" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={() => navigate(-1)} className="bg-ink-100" style={{ padding: '8px 16px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#334155' }}>
            ← Voltar
          </button>
          <button onClick={() => window.print()} style={{ padding: '8px 20px', background: '#4F46E5', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'white' }}>
            ↓ Salvar PDF
          </button>
        </div>

        <div className="header">
          <div className="logo-area">
            <div className="logo-box"><span className="logo-zap">WF</span></div>
            <div>
              <div className="logo-name">WAY FIT</div>
              <div className="logo-sub">Relatório de Evolução do Aluno</div>
            </div>
          </div>
          <div className="header-date">
            <p>Personal: <strong>{personalName}</strong></p>
            <p style={{ marginTop: 4 }}>Gerado em {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p style={{ marginTop: 2 }}>Período: últimos 90 dias</p>
          </div>
        </div>

        <div className="student-card">
          <div className="avatar" style={{ background: color }}>{initials}</div>
          <div className="student-info">
            <h2>{student.name}</h2>
            <p>{student.email || student.phone || ''}{student.plan ? ` · Plano ${student.plan}` : ''}</p>
            {student.goal && <div className="goal-badge">{student.goal}</div>}
          </div>
        </div>

        <div className="section">
          <div className="section-title">Resumo dos Treinos</div>
          <div className="stats-grid">
            {[
              { value: totalSessions, label: 'Sessões nos\núltimos 90 dias', color: '#4F46E5' },
              { value: `${completionRate}%`, label: 'Taxa de\nconclusão', color: completionRate >= 70 ? '#059669' : '#D97706' },
              { value: thisMonthSessions, label: 'Treinos\neste mês', color: '#7C3AED' },
              { value: completedSessions, label: 'Treinos\ncompletos', color: '#059669' },
            ].map((s, i) => (
              <div key={i} className="stat-box">
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="section-title">Frequência — Últimas 4 semanas</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {last4Weeks.map(date => {
              const trained = sessionDates.has(date);
              const isFuture = date > today;
              const d = new Date(date + 'T12:00:00');
              const label = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
              return (
                <div key={date} title={label} className={`week-dot ${trained ? 'done' : 'miss'}`} style={{ opacity: isFuture ? 0.3 : 1 }}>
                  {trained ? '✓' : ''}
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
            Verde = treino registrado · {completedSessions} completos de {totalSessions} sessões
          </p>
        </div>

        {exerciseProgression.length > 0 && (
          <div className="section">
            <div className="section-title">Evolução de Cargas</div>
            <table>
              <thead><tr><th>Exercício</th><th>Carga inicial</th><th>Carga atual</th><th>Evolução</th><th>Sessões</th></tr></thead>
              <tbody>
                {exerciseProgression.map((ex, i) => {
                  const d = (ex.last - ex.first).toFixed(1);
                  const isUp = d > 0;
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{ex.name}</td>
                      <td>{ex.first}kg</td>
                      <td style={{ fontWeight: 700 }}>{ex.last}kg</td>
                      <td className={isUp ? 'ex-up' : 'ex-down'}>{isUp ? '+' : ''}{d}kg {isUp ? '↑' : '↓'}</td>
                      <td style={{ color: '#94A3B8' }}>{ex.sessions}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {measurements.length > 0 && (
          <div className="section">
            <div className="section-title">Medições Corporais</div>
            {firstM && lastM && firstM.id !== lastM.id && (
              <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 10 }}>
                Comparação: {new Date(firstM.recorded_at || firstM.date + 'T12:00:00').toLocaleDateString('pt-BR')} → {new Date(lastM.recorded_at || lastM.date + 'T12:00:00').toLocaleDateString('pt-BR')}
              </p>
            )}
            <div className="progress-grid">
              {[
                { key: 'weight', label: 'Peso', unit: 'kg', positive: -1 },
                { key: 'body_fat', label: 'Gordura', unit: '%', positive: -1 },
                { key: 'waist', label: 'Cintura', unit: 'cm', positive: -1 },
                { key: 'chest', label: 'Peito', unit: 'cm', positive: 1 },
                { key: 'arm', label: 'Braço', unit: 'cm', positive: 1 },
                { key: 'hip', label: 'Quadril', unit: 'cm', positive: -1 },
              ].map(m => {
                const cur = lastM?.[m.key];
                if (!cur) return null;
                const first = firstM?.[m.key];
                const d = first && lastM.id !== firstM.id ? diff(first, cur) : null;
                const isGood = d ? (parseFloat(d) * m.positive > 0) : null;
                return (
                  <div key={m.key} className="measure-box">
                    <div className="measure-val">{cur}</div>
                    <div className="measure-unit">{m.unit}</div>
                    {d && <div className="measure-diff" style={{ color: isGood ? '#059669' : '#DC2626' }}>{d}{m.unit}</div>}
                    <div className="measure-label">{m.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {sessions.length > 0 && (
          <div className="section">
            <div className="section-title">Últimas Sessões</div>
            <table>
              <thead><tr><th>Data</th><th>Treino</th><th>Exercícios</th><th>Status</th></tr></thead>
              <tbody>
                {[...sessions].reverse().slice(0, 10).map((s, i) => {
                  const pct = s.exercises_total > 0 ? Math.round(s.exercises_done / s.exercises_total * 100) : null;
                  return (
                    <tr key={i}>
                      <td>{new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                      <td style={{ fontWeight: 600 }}>{s.plan_name || '—'}</td>
                      <td>{s.exercises_total > 0 ? `${s.exercises_done}/${s.exercises_total}` : '—'}</td>
                      <td style={{ color: pct === 100 ? '#059669' : pct != null ? '#D97706' : '#94A3B8', fontWeight: 700 }}>
                        {pct === 100 ? 'Completo ✓' : pct != null ? `${pct}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="footer">
          <p>Gerado automaticamente pelo WAY FIT · wayfit.app</p>
          <div>
            <div className="signature">{personalName}</div>
            <p>Personal Trainer</p>
          </div>
        </div>
      </div>
    </div>
  );
}
