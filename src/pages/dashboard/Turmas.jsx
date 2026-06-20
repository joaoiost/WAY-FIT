import { useState, useEffect } from 'react';
import { Users, Plus, ChevronRight, Clock, MapPin, Trash2, X, Check, Minus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';

const TYPES = ['Musculação','Funcional','Hipertrofia','Cardio','Yoga','Pilates','Força','HIIT','Mobilidade'];
const TYPE_COLORS = { Musculação:'#3B82F6', Funcional:'#10B981', Hipertrofia:'#8B5CF6', Cardio:'#F59E0B', Yoga:'#EC4899', Pilates:'#06B6D4', Força:'#EF4444', HIIT:'#F97316', Mobilidade:'#A78BFA' };
const STATUS_CYCLE = [null, 'confirmado', 'presente', 'ausente'];
const STATUS_LABEL = { confirmado: 'Confirmado', presente: 'Presente', ausente: 'Ausente' };
const STATUS_COLOR = { confirmado: '#F59E0B', presente: '#3FB950', ausente: '#F85149' };

const AVATAR_COLORS = ['#6366F1','#10B981','#8B5CF6','#F59E0B','#EF4444','#EC4899','#06B6D4'];
function avatarColor(id) { return AVATAR_COLORS[String(id).charCodeAt(0) % AVATAR_COLORS.length]; }
function initials(name = '') { return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'; }

const emptyForm = { name: '', type: 'Musculação', date: new Date().toISOString().slice(0, 10), time: '07:00', duration_minutes: 60, max_students: 15, location: '', notes: '' };

export default function Turmas() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');
  const [createModal, setCreateModal] = useState(false);
  const [detailClass, setDetailClass] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !hasSupabase) { setLoading(false); return; }
    loadData();
  }, [user?.id]);

  async function loadData() {
    const [classRes, studRes] = await Promise.all([
      supabase.from('group_classes').select('*, group_class_attendance(student_id, status)').eq('personal_id', user.id).order('date').order('time'),
      supabase.from('students').select('id, name, color, initials, status').eq('personal_id', user.id).eq('status', 'ativo').order('name'),
    ]);
    setClasses(classRes.data || []);
    setStudents(studRes.data || []);
    setLoading(false);
  }

  async function createClass() {
    setSaving(true);
    await supabase.from('group_classes').insert({ ...form, personal_id: user.id });
    setCreateModal(false);
    setForm(emptyForm);
    setSaving(false);
    loadData();
  }

  async function deleteClass(id) {
    if (!confirm('Excluir esta aula?')) return;
    await supabase.from('group_classes').delete().eq('id', id);
    setDetailClass(null);
    loadData();
  }

  function openDetail(cls) {
    setDetailClass(cls);
    const att = {};
    (cls.group_class_attendance || []).forEach(a => { att[a.student_id] = a.status; });
    setAttendance(att);
  }

  function cycleStatus(studentId) {
    const cur = attendance[studentId] || null;
    const idx = STATUS_CYCLE.indexOf(cur);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    setAttendance(p => ({ ...p, [studentId]: next }));
  }

  async function saveAttendance() {
    setSaving(true);
    const rows = Object.entries(attendance)
      .filter(([, status]) => status !== null)
      .map(([student_id, status]) => ({ class_id: detailClass.id, student_id, status }));
    if (rows.length) {
      await supabase.from('group_class_attendance').upsert(rows, { onConflict: 'class_id,student_id' });
    }
    const toRemove = Object.entries(attendance).filter(([, s]) => s === null).map(([id]) => id);
    if (toRemove.length) {
      await supabase.from('group_class_attendance').delete().eq('class_id', detailClass.id).in('student_id', toRemove);
    }
    setSaving(false);
    setDetailClass(null);
    loadData();
  }

  const today = new Date().toISOString().slice(0, 10);
  const filtered = classes.filter(c => filter === 'upcoming' ? c.date >= today : c.date < today);
  const totalStudentsTaught = new Set(classes.flatMap(c => (c.group_class_attendance || []).filter(a => a.status === 'presente').map(a => a.student_id))).size;
  const nextClass = classes.find(c => c.date >= today);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page-padding">
      <div className="page-header">
        <div>
          <h2 className="page-title">Turmas</h2>
          <p className="page-subtitle">Aulas coletivas e lista de presença</p>
        </div>
        <div className="page-actions">
          <button onClick={() => setCreateModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Nova Aula
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total de aulas', value: classes.length },
          { label: 'Alunos atendidos', value: totalStudentsTaught },
          { label: 'Próxima aula', value: nextClass ? new Date(nextClass.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—' },
        ].map(s => (
          <div key={s.label} className="kpi-card" style={{ flex: 1, cursor: 'default', padding: '12px 10px' }}>
            <p className="kpi-card-value" style={{ fontSize: 18 }}>{s.value}</p>
            <p className="kpi-card-label">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="filter-pills" style={{ marginBottom: 16 }}>
        {[['upcoming','Próximas'],['past','Passadas']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`pill${filter === k ? ' active' : ''}`}>{l}</button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><Users size={24} /></div>
          <p className="empty-state-title">{filter === 'upcoming' ? 'Nenhuma aula agendada' : 'Nenhuma aula passada'}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(cls => {
          const color = TYPE_COLORS[cls.type] || 'var(--accent)';
          const presentCount = (cls.group_class_attendance || []).filter(a => a.status === 'presente').length;
          const totalAtt = (cls.group_class_attendance || []).length;
          return (
            <div key={cls.id} className="clickable-card" onClick={() => openDetail(cls)}>
              <div style={{ width: 48, flexShrink: 0, textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--gray-900)', lineHeight: 1 }}>
                  {new Date(cls.date + 'T12:00:00').getDate()}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase' }}>
                  {new Date(cls.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' })}
                </p>
              </div>
              <div className="list-row-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                  <p className="list-row-title" style={{ margin: 0 }}>{cls.name}</p>
                  <span style={{ fontSize: 10, fontWeight: 700, color, background: color + '18', padding: '2px 7px', borderRadius: 20 }}>{cls.type}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span className="list-row-sub" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Clock size={10} /> {cls.time?.slice(0,5)} · {cls.duration_minutes}min
                  </span>
                  {cls.location && (
                    <span className="list-row-sub" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <MapPin size={10} /> {cls.location}
                    </span>
                  )}
                  {totalAtt > 0 && (
                    <span className="list-row-sub" style={{ color: 'var(--green)' }}>
                      {presentCount}/{totalAtt} presentes
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={16} color="var(--gray-400)" />
            </div>
          );
        })}
      </div>

      {/* Create modal */}
      {createModal && (
        <div className="modal-overlay" onClick={() => setCreateModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nova Aula</h3>
              <button onClick={() => setCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--gray-400)" /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[['Nome da aula', 'name', 'text'], ['Local', 'location', 'text']].map(([l, k, t]) => (
                <div key={k}>
                  <label style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 600 }}>{l}</label>
                  <input type={t} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} style={{ display: 'block', width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--gray-900)', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 600 }}>Tipo</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={{ display: 'block', width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--gray-900)', fontSize: 14 }}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Data', 'date', 'date'], ['Horário', 'time', 'time']].map(([l, k, t]) => (
                  <div key={k}>
                    <label style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 600 }}>{l}</label>
                    <input type={t} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} style={{ display: 'block', width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--gray-900)', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Duração (min)', 'duration_minutes'], ['Máx. alunos', 'max_students']].map(([l, k]) => (
                  <div key={k}>
                    <label style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 600 }}>{l}</label>
                    <input type="number" value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} style={{ display: 'block', width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-page)', color: 'var(--gray-900)', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              <button onClick={createClass} disabled={!form.name || saving} className="btn-primary" style={{ width: '100%', padding: '13px 0', marginTop: 4 }}>
                {saving ? 'Salvando...' : 'Criar Aula'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail/attendance modal */}
      {detailClass && (
        <div className="modal-overlay" onClick={() => setDetailClass(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{detailClass.name}</h3>
              <button onClick={() => setDetailClass(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--gray-400)" /></button>
            </div>
            <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--gray-400)' }}>
              {new Date(detailClass.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} · {detailClass.time?.slice(0,5)} · {detailClass.duration_minutes}min
            </p>
            {detailClass.location && <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} />{detailClass.location}</p>}

            <p style={{ margin: '14px 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase' }}>Lista de Presença</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {students.map(s => {
                const status = attendance[s.id] || null;
                const color = s.color || avatarColor(s.id);
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar avatar-sm" style={{ background: color }}>{s.initials || initials(s.name)}</div>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--gray-900)' }}>{s.name}</span>
                    <button onClick={() => cycleStatus(s.id)} style={{
                      padding: '4px 12px', borderRadius: 20, border: `1px solid ${status ? STATUS_COLOR[status] : 'var(--border)'}`,
                      background: status ? STATUS_COLOR[status] + '18' : 'var(--bg-page)', cursor: 'pointer',
                      fontSize: 11, fontWeight: 700, color: status ? STATUS_COLOR[status] : 'var(--gray-400)',
                    }}>
                      {status ? STATUS_LABEL[status] : '—'}
                    </button>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => deleteClass(detailClass.id)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--red)' }}>
                <Trash2 size={14} /> Excluir
              </button>
              <button onClick={saveAttendance} disabled={saving} className="btn-primary" style={{ flex: 1 }}>
                {saving ? 'Salvando...' : 'Salvar Presença'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
