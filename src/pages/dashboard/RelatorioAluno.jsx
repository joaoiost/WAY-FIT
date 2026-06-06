import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: white; }

  .report { max-width: 210mm; margin: 0 auto; padding: 12mm 16mm; color: #111827; }

  .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #F3F4F6; }
  .logo-area { display: flex; align-items: center; gap: 10px; }
  .logo-box { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg,#3B82F6,#8B5CF6); display: flex; align-items: center; justify-content: center; }
  .logo-zap { font-size: 22px; color: white; font-weight: 900; }
  .logo-name { font-size: 22px; font-weight: 900; color: #111827; }
  .logo-sub { font-size: 11px; color: #9CA3AF; font-weight: 500; margin-top: 2px; }
  .header-date { text-align: right; }
  .header-date p { font-size: 12px; color: #6B7280; }
  .header-date strong { font-size: 13px; color: #111827; }

  .student-card { background: #F9FAFB; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 16px; }
  .avatar { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 900; color: white; flex-shrink: 0; }
  .student-info h2 { font-size: 20px; font-weight: 900; color: #111827; }
  .student-info p { font-size: 13px; color: #6B7280; margin-top: 2px; }
  .goal-badge { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg,#8B5CF6,#3B82F6); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 6px; }

  .section { margin-bottom: 24px; }
  .section-title { font-size: 13px; font-weight: 800; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .section-title::after { content: ''; flex: 1; height: 1px; background: #F3F4F6; }

  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .stat-box { background: white; border: 1px solid #F1F5F9; border-radius: 10px; padding: 14px 12px; text-align: center; }
  .stat-value { font-size: 26px; font-weight: 900; line-height: 1; }
  .stat-label { font-size: 11px; color: #9CA3AF; font-weight: 500; margin-top: 4px; line-height: 1.3; }

  .progress-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .measure-box { background: #F9FAFB; border-radius: 10px; padding: 12px; text-align: center; }
  .measure-val { font-size: 22px; font-weight: 900; color: #111827; }
  .measure-unit { font-size: 11px; color: #9CA3AF; }
  .measure-diff { font-size: 12px; font-weight: 700; margin-top: 4px; }
  .measure-label { font-size: 11px; color: #6B7280; margin-top: 2px; }

  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead tr { background: #F9FAFB; }
  th { padding: 9px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.04em; }
  td { padding: 10px 12px; border-bottom: 1px solid #F9FAFB; color: #374151; }
  tr:last-child td { border-bottom: none; }
  .ex-up { color: #10B981; font-weight: 700; }
  .ex-down { color: #EF4444; font-weight: 700; }

  .week-row { display: flex; gap: 6px; margin-bottom: 4px; }
  .week-dot { width: 18px; height: 18px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; }
  .week-dot.done { background: #10B981; color: white; }
  .week-dot.miss { background: #E5E7EB; color: #9CA3AF; }

  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #F3F4F6; display: flex; align-items: center; justify-content: space-between; }
  .footer p { font-size: 11px; color: #9CA3AF; }
  .footer .signature { font-size: 13px; font-weight: 700; color: #374151; }

  .no-print { margin-bottom: 20px; }

  @media print {
    .no-print { display: none !important; }
    .report { padding: 10mm 14mm; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

function avatarColor(id) {
  const COLORS = ['#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444','#EC4899','#06B6D4'];
  return COLORS[(id?.charCodeAt(0) || 0) % COLORS.length];
}

function diff(a, b, unit = '') {
  if (a == null || b == null) return null;
  const d = (b - a).toFixed(1);
  const sign = d > 0 ? '+' : '';
  return `${sign}${d}${unit}`;
}

export default function RelatorioAluno() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  useEffect(() => {
    if (!user || !id || !hasSupabase) { setLoading(false); return; }

    (async () => {
      try {
        const [
          { data: student },
          { data: sessions },
          { data: measurements },
          { data: exLogs },
          { data: profile },
        ] = await Promise.all([
          supabase.from('students').select('*').eq('id', id).eq('personal_id', user.id).single(),
          supabase.from('workout_sessions').select('date, plan_name, exercises_done, exercises_total, finished_at').eq('student_id', id).gte('date', ninetyDaysAgo).order('date'),
          supabase.from('student_measurements').select('*').eq('student_id', id).order('recorded_at'),
          supabase.from('exercise_logs').select('exercise_name, load_actual, done, created_at').eq('student_id', id).not('load_actual', 'is', null).order('created_at').limit(200),
          supabase.from('profiles').select('name, email').eq('id', user.id).single(),
        ]);

        if (!student) { setError('Aluno não encontrado.'); setLoading(false); return; }
        setData({ student, sessions: sessions || [], measurements: measurements || [], exLogs: exLogs || [], profile });
        setLoading(false);
      } catch (e) {
        setError('Erro ao carregar dados.');
        setLoading(false);
      }
    })();
  }, [user?.id, id]);

  // Auto print
  useEffect(() => {
    if (!loading && data) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [loading, data]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #E5E7EB', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#6B7280', fontSize: 14 }}>Preparando relatório...</p>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 12 }}>
      <p style={{ color: '#EF4444' }}>{error || 'Sem dados.'}</p>
      <button onClick={() => navigate(-1)} style={{ padding: '8px 16px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Voltar</button>
    </div>
  );

  const { student, sessions, measurements, exLogs, profile } = data;

  // Stats
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.exercises_total > 0 && s.exercises_done >= s.exercises_total).length;
  const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
  const thisMonthSessions = sessions.filter(s => s.date.startsWith(thisMonth)).length;

  // Measurements
  const firstM = measurements[0];
  const lastM = measurements[measurements.length - 1];

  // Exercise progression
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

  // Last 4 weeks
  const last4Weeks = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    return d.toISOString().slice(0, 10);
  });
  const sessionDates = new Set(sessions.map(s => s.date));

  const color = student.color || avatarColor(student.id);
  const initials = student.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const personalName = profile?.name || 'Personal Trainer';

  return (
    <>
      <style>{CSS}</style>
      <div className="report">

        {/* Print button — hidden on print */}
        <div className="no-print" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={() => navigate(-1)}
            style={{ padding: '8px 16px', background: '#F3F4F6', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151' }}>
            ← Voltar
          </button>
          <button onClick={() => window.print()}
            style={{ padding: '8px 20px', background: 'linear-gradient(135deg,#3B82F6,#8B5CF6)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'white' }}>
            ↓ Salvar PDF
          </button>
        </div>

        {/* Header */}
        <div className="header">
          <div className="logo-area">
            <div className="logo-box">
              <span className="logo-zap">⚡</span>
            </div>
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

        {/* Student card */}
        <div className="student-card">
          <div className="avatar" style={{ background: color }}>{initials}</div>
          <div className="student-info">
            <h2>{student.name}</h2>
            <p>{student.email || student.phone || ''}{student.plan ? ` · Plano ${student.plan}` : ''}</p>
            {student.goal && <div className="goal-badge">🎯 {student.goal}</div>}
          </div>
        </div>

        {/* Stats */}
        <div className="section">
          <div className="section-title">Resumo dos Treinos</div>
          <div className="stats-grid">
            {[
              { value: totalSessions, label: 'Sessões nos\núltimos 90 dias', color: '#3B82F6' },
              { value: `${completionRate}%`, label: 'Taxa de\nconclusão', color: completionRate >= 70 ? '#10B981' : '#F59E0B' },
              { value: thisMonthSessions, label: 'Treinos\neste mês', color: '#8B5CF6' },
              { value: completedSessions, label: 'Treinos\ncompletos', color: '#10B981' },
            ].map((s, i) => (
              <div key={i} className="stat-box">
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance heatmap — last 4 weeks */}
        <div className="section">
          <div className="section-title">Frequência — Últimas 4 semanas</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {last4Weeks.map(date => {
              const trained = sessionDates.has(date);
              const isFuture = date > today;
              const d = new Date(date + 'T12:00:00');
              const label = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
              return (
                <div key={date} title={label} className={`week-dot ${trained ? 'done' : 'miss'}`}
                  style={{ opacity: isFuture ? 0.3 : 1 }}>
                  {trained ? '✓' : ''}
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
            Verde = treino registrado · {completedSessions} completos de {totalSessions} sessões
          </p>
        </div>

        {/* Exercise progression */}
        {exerciseProgression.length > 0 && (
          <div className="section">
            <div className="section-title">Evolução de Cargas</div>
            <table>
              <thead>
                <tr>
                  <th>Exercício</th>
                  <th>Carga inicial</th>
                  <th>Carga atual</th>
                  <th>Evolução</th>
                  <th>Sessões</th>
                </tr>
              </thead>
              <tbody>
                {exerciseProgression.map((ex, i) => {
                  const d = (ex.last - ex.first).toFixed(1);
                  const isUp = d > 0;
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{ex.name}</td>
                      <td>{ex.first}kg</td>
                      <td style={{ fontWeight: 700 }}>{ex.last}kg</td>
                      <td className={isUp ? 'ex-up' : 'ex-down'}>
                        {isUp ? '+' : ''}{d}kg {isUp ? '↑' : '↓'}
                      </td>
                      <td style={{ color: '#9CA3AF' }}>{ex.sessions}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Measurements */}
        {measurements.length > 0 && (
          <div className="section">
            <div className="section-title">Medições Corporais</div>
            {firstM && lastM && firstM.id !== lastM.id && (
              <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>
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
                    {d && <div className="measure-diff" style={{ color: isGood ? '#10B981' : '#EF4444' }}>{d}{m.unit}</div>}
                    <div className="measure-label">{m.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent sessions */}
        {sessions.length > 0 && (
          <div className="section">
            <div className="section-title">Últimas Sessões</div>
            <table>
              <thead>
                <tr><th>Data</th><th>Treino</th><th>Exercícios</th><th>Status</th></tr>
              </thead>
              <tbody>
                {[...sessions].reverse().slice(0, 10).map((s, i) => {
                  const pct = s.exercises_total > 0 ? Math.round(s.exercises_done / s.exercises_total * 100) : null;
                  return (
                    <tr key={i}>
                      <td>{new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                      <td style={{ fontWeight: 600 }}>{s.plan_name || '—'}</td>
                      <td>{s.exercises_total > 0 ? `${s.exercises_done}/${s.exercises_total}` : '—'}</td>
                      <td style={{ color: pct === 100 ? '#10B981' : pct != null ? '#F59E0B' : '#9CA3AF', fontWeight: 700 }}>
                        {pct === 100 ? 'Completo ✓' : pct != null ? `${pct}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="footer">
          <p>Gerado automaticamente pelo WAY FIT · wayfit.app</p>
          <div>
            <div className="signature">{personalName}</div>
            <p>Personal Trainer</p>
          </div>
        </div>

      </div>
    </>
  );
}
