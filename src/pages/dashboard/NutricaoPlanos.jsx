import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Salad, Search, ChevronRight, Plus, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const AVATAR_COLORS = ['#6366F1', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];
function avatarColor(id) { return AVATAR_COLORS[String(id).charCodeAt(0) % AVATAR_COLORS.length]; }
function initials(name = '') { return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'; }

function MacroBadge({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', padding: '6px 10px', borderRadius: 8, background: color + '12' }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color }}>{value}<span style={{ fontSize: 10, fontWeight: 600 }}>g</span></p>
      <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
    </div>
  );
}

export default function NutricaoPlanos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todos');

  useEffect(() => {
    if (!user) return;
    if (!hasSupabase) { setLoading(false); return; }

    Promise.all([
      supabase.from('students').select('id, name, status, color, initials').eq('personal_id', user.id).eq('status', 'ativo').order('name'),
      supabase.from('meal_plans').select('id, student_id, name, goal, updated_at, is_active').eq('personal_id', user.id).eq('is_active', true),
    ]).then(([{ data: stds }, { data: mps }]) => {
      setStudents(stds || []);
      setPlans(mps || []);
      setLoading(false);
    });
  }, [user?.id]);

  const planMap = Object.fromEntries(plans.map(p => [p.student_id, p]));

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const hasPlan = !!planMap[s.id];
    if (filter === 'com_plano') return matchSearch && hasPlan;
    if (filter === 'sem_plano') return matchSearch && !hasPlan;
    return matchSearch;
  });

  const withPlan = students.filter(s => planMap[s.id]).length;
  const withoutPlan = students.length - withPlan;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
      <div style={{ width: 28, height: 28, border: '3px solid #EEF2FF', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="page-padding">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Salad size={18} color="#6366F1" />
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--gray-900)', letterSpacing: '-0.3px' }}>Planos Alimentares</h2>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-400)' }}>Gerencie a nutrição dos seus alunos</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/nutricao/alimentos')}
          className="btn-secondary"
          style={{ fontSize: 13 }}
        >
          Banco de Alimentos
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Alunos ativos', value: students.length, icon: CheckCircle, color: '#6366F1', bg: '#EEF2FF' },
          { label: 'Com plano', value: withPlan, icon: CheckCircle, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Sem plano', value: withoutPlan, icon: AlertCircle, color: '#F59E0B', bg: '#FFFBEB' },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: 14, padding: '16px 18px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <s.icon size={16} color={s.color} />
            </div>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--gray-900)', lineHeight: 1 }}>{s.value}</p>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--gray-400)', fontWeight: 600 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'white', border: '1.5px solid var(--border)', borderRadius: 9, padding: '7px 12px', flex: 1, minWidth: 200 }}>
          <Search size={14} color="var(--gray-400)" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar aluno..."
            style={{ border: 'none', outline: 'none', fontSize: 13, flex: 1, padding: 0, boxShadow: 'none', background: 'transparent', width: 'auto' }}
          />
        </div>
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'com_plano', label: 'Com plano' },
          { key: 'sem_plano', label: 'Sem plano' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ padding: '7px 16px', borderRadius: 9, border: `1.5px solid ${filter === f.key ? 'var(--accent)' : 'var(--border)'}`, background: filter === f.key ? 'var(--accent-bg)' : 'white', color: filter === f.key ? 'var(--accent-text)' : 'var(--gray-600)', fontSize: 13, fontWeight: filter === f.key ? 700 : 500, cursor: 'pointer' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--gray-400)' }}>
            <Salad size={40} color="var(--gray-200)" style={{ display: 'block', margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontWeight: 600 }}>Nenhum aluno encontrado</p>
          </div>
        )}
        {filtered.map(student => {
          const plan = planMap[student.id];
          const color = student.color || avatarColor(student.id);
          const updatedAt = plan?.updated_at ? new Date(plan.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : null;

          return (
            <div key={student.id}
              onClick={() => navigate(`/dashboard/alunos/${student.id}/nutricao`)}
              style={{ background: 'white', borderRadius: 14, padding: '14px 18px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'all 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(99,102,241,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}
            >
              {/* Avatar */}
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                {(student.initials || initials(student.name))}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--gray-900)' }}>{student.name}</p>
                {plan ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981' }}>● {plan.name}</span>
                    {updatedAt && (
                      <span style={{ fontSize: 11, color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={10} /> {updatedAt}
                      </span>
                    )}
                  </div>
                ) : (
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>● Sem plano alimentar</p>
                )}
              </div>

              {/* Action */}
              <button
                onClick={e => { e.stopPropagation(); navigate(`/dashboard/alunos/${student.id}/nutricao`); }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, border: 'none', background: plan ? 'var(--accent-bg)' : '#FFFBEB', color: plan ? 'var(--accent-text)' : '#D97706', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
              >
                {plan ? 'Editar plano' : '+ Criar plano'} <ChevronRight size={13} />
              </button>
            </div>
          );
        })}
      </div>

      {students.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Salad size={30} color="#6366F1" />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: 'var(--gray-900)' }}>Nenhum aluno ativo</h3>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--gray-400)' }}>Cadastre alunos para criar planos alimentares</p>
          <button onClick={() => navigate('/dashboard/alunos')} className="btn-primary">Ir para Alunos</button>
        </div>
      )}
    </div>
  );
}
