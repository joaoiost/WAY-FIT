import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Salad, Search, ChevronRight, Clock, BookOpen } from 'lucide-react';
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

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page-padding">

      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Planos Alimentares</h2>
          <p className="page-subtitle">Gerencie a nutrição dos seus alunos</p>
        </div>
        <div className="page-actions">
          <button onClick={() => navigate('/dashboard/nutricao/alimentos')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <BookOpen size={15} />
            <span className="hide-mobile">Banco de Alimentos</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Ativos', value: students.length },
          { label: 'Com plano', value: withPlan },
          { label: 'Sem plano', value: withoutPlan },
        ].map(s => (
          <div key={s.label} className="kpi-card" style={{ cursor: 'default', flex: 1, padding: '12px 14px' }}>
            <p className="kpi-card-value" style={{ fontSize: 22 }}>{s.value}</p>
            <p className="kpi-card-label">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <div className="search-bar">
          <Search size={14} color="var(--gray-400)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar aluno..." />
        </div>
        <div className="filter-pills" style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 2 }}>
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'com_plano', label: 'Com plano' },
            { key: 'sem_plano', label: 'Sem plano' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`pill${filter === f.key ? ' active' : ''}`} style={{ flexShrink: 0 }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon"><Salad size={24} /></div>
            <p className="empty-state-title">Nenhum aluno encontrado</p>
          </div>
        )}
        {filtered.map(student => {
          const plan = planMap[student.id];
          const color = student.color || avatarColor(student.id);
          const updatedAt = plan?.updated_at ? new Date(plan.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : null;

          return (
            <div key={student.id} className="clickable-card"
              onClick={() => navigate(`/dashboard/alunos/${student.id}/nutricao`)}>
              <div className="avatar avatar-md" style={{ background: color }}>
                {student.initials || initials(student.name)}
              </div>

              <div className="list-row-body">
                <p className="list-row-title">{student.name}</p>
                {plan ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)' }}>● {plan.name}</span>
                    {updatedAt && (
                      <span style={{ fontSize: 11, color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={10} /> {updatedAt}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="list-row-sub" style={{ color: 'var(--yellow)' }}>● Sem plano alimentar</p>
                )}
              </div>

              <button
                onClick={e => { e.stopPropagation(); navigate(`/dashboard/alunos/${student.id}/nutricao`); }}
                className={plan ? 'btn-secondary' : 'btn-primary'}
                style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="hide-mobile">{plan ? 'Editar' : 'Criar'}</span>
                <ChevronRight size={13} />
              </button>
            </div>
          );
        })}
      </div>

      {students.length === 0 && !loading && (
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <div className="empty-state-icon" style={{ width: 64, height: 64, borderRadius: 20 }}><Salad size={30} /></div>
          <p className="empty-state-title" style={{ fontSize: 17 }}>Nenhum aluno ativo</p>
          <p className="empty-state-desc">Cadastre alunos para criar planos alimentares</p>
          <button onClick={() => navigate('/dashboard/alunos')} className="btn-primary" style={{ marginTop: 8 }}>Ir para Alunos</button>
        </div>
      )}
    </div>
  );
}
