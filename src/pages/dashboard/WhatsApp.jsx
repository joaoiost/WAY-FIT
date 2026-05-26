import { useState, useEffect } from 'react';
import { Send, MessageSquare, Copy, CheckCheck, Clock, Loader, Users, ExternalLink, ChevronRight, Bell, BellRing } from 'lucide-react';
import { messageTemplates } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { supabase, hasSupabase } from '../../lib/supabase';
import { students as mockStudents } from '../../data/mockData';

function getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];
function colorForName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

export default function WhatsApp() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [mode, setMode] = useState('individual'); // 'individual' | 'massa'
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [massMessage, setMassMessage] = useState('');
  const [massTemplate, setMassTemplate] = useState(null);
  const [massLinks, setMassLinks] = useState([]); // { student, url, opened }
  const [sent, setSent] = useState([]);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifStudentIds, setNotifStudentIds] = useState([]); // empty = all
  const [notifSending, setNotifSending] = useState(false);
  const [notifResult, setNotifResult] = useState(null); // { ok, sent, message }

  useEffect(() => {
    if (!user) return;
    if (hasSupabase) {
      supabase.from('students').select('id, name, phone').eq('personal_id', user.id).eq('status', 'ativo').then(({ data }) => {
        setStudents(data || []);
        setLoadingStudents(false);
      });
    } else {
      setStudents(mockStudents);
      setLoadingStudents(false);
    }
  }, [user?.id]);

  const selectedStudent = students.find(s => String(s.id) === String(selectedStudentId));

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    if (selectedStudent) {
      setCustomMessage(template.message.replace('{nome}', selectedStudent.name.split(' ')[0]));
    } else {
      setCustomMessage(template.message);
    }
  };

  const handleStudentChange = (e) => {
    setSelectedStudentId(e.target.value);
    const student = students.find(s => String(s.id) === e.target.value);
    if (selectedTemplate && student) {
      setCustomMessage(selectedTemplate.message.replace('{nome}', student.name.split(' ')[0]));
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !customMessage.trim()) return;
    setSending(true);

    // Open WhatsApp if student has phone
    if (selectedStudent.phone) {
      const phone = selectedStudent.phone.replace(/\D/g, '');
      const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
      const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(customMessage)}`;
      window.open(waUrl, '_blank');
    }

    await new Promise(r => setTimeout(r, 600));
    setSent(prev => [{
      id: Date.now(),
      studentName: selectedStudent.name,
      template: selectedTemplate?.name || 'Mensagem personalizada',
      message: customMessage,
      sentAt: new Date().toLocaleString('pt-BR'),
    }, ...prev]);

    setSending(false);
    setSuccess(true);
    setCustomMessage('');
    setSelectedTemplate(null);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleMassTemplateSelect = (t) => {
    setMassTemplate(t);
    setMassMessage(t.message);
  };

  const handleGenerateLinks = () => {
    if (!massMessage.trim()) return;
    const withPhone = students.filter(s => s.phone);
    const links = withPhone.map(s => {
      const msg = massMessage.replace(/{nome}/g, s.name.split(' ')[0]);
      const phone = s.phone.replace(/\D/g, '');
      const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
      return { student: s, url: `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, opened: false, msg };
    });
    setMassLinks(links);
  };

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) return;
    setNotifSending(true);
    setNotifResult(null);

    const targetIds = notifStudentIds.length > 0
      ? notifStudentIds
      : students.map(s => String(s.id));

    if (!targetIds.length) {
      setNotifSending(false);
      setNotifResult({ ok: false, message: 'Nenhum aluno selecionado' });
      return;
    }

    try {
      if (hasSupabase) {
        // Try Edge Function first (sends real push + saves notification)
        const { data, error } = await supabase.functions.invoke('send-push', {
          body: { student_ids: targetIds, title: notifTitle.trim(), message: notifMessage.trim(), personal_id: user.id },
        });

        if (error || !data?.ok) {
          // Fallback: insert into student_notifications directly (in-app only)
          await supabase.from('student_notifications').insert(
            targetIds.map(sid => ({
              student_id: sid,
              personal_id: user.id,
              title: notifTitle.trim(),
              message: notifMessage.trim(),
              type: 'custom',
            }))
          );
          setNotifResult({ ok: true, sent: targetIds.length, message: `Notificação enviada para ${targetIds.length} aluno(s) — aparecerá no app deles.` });
        } else {
          setNotifResult({ ok: true, sent: data.sent ?? targetIds.length, message: `Notificação push enviada para ${data.sent ?? targetIds.length} aluno(s)!` });
        }
      } else {
        setNotifResult({ ok: true, sent: targetIds.length, message: `(modo demo) Notificação enviada para ${targetIds.length} aluno(s)` });
      }

      setNotifTitle('');
      setNotifMessage('');
      setNotifStudentIds([]);
    } catch (e) {
      setNotifResult({ ok: false, message: `Erro: ${e.message}` });
    }
    setNotifSending(false);
  };

  const openLink = (idx) => {
    window.open(massLinks[idx].url, '_blank');
    setMassLinks(prev => prev.map((l, i) => i === idx ? { ...l, opened: true } : l));
  };

  const openAll = () => {
    massLinks.forEach((l, i) => {
      setTimeout(() => {
        window.open(l.url, '_blank');
        setMassLinks(prev => prev.map((x, j) => j === i ? { ...x, opened: true } : x));
      }, i * 400);
    });
  };

  return (
    <div className="page-padding" style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>WhatsApp</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6B7280' }}>
            {loadingStudents ? 'Carregando...' : `${students.length} alunos ativos`}
          </p>
        </div>
        <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 10, padding: 4, gap: 4 }}>
          {[{ key: 'individual', label: 'Individual', icon: Send }, { key: 'massa', label: 'Em massa', icon: Users }, { key: 'notificacao', label: 'Notificações', icon: Bell }].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setMode(key); setMassLinks([]); setNotifResult(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                background: mode === key ? 'white' : 'transparent',
                color: mode === key ? '#111827' : '#6B7280',
                boxShadow: mode === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* MASS MODE */}
      {mode === 'massa' && (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#111827' }}>Templates</h3>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: '#9CA3AF' }}>Selecione para preencher a mensagem</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {messageTemplates.map(t => (
                  <button key={t.id} onClick={() => handleMassTemplateSelect(t)}
                    style={{ textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: `1px solid ${massTemplate?.id === t.id ? '#3B82F6' : '#E5E7EB'}`, background: massTemplate?.id === t.id ? '#EFF6FF' : 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: massTemplate?.id === t.id ? '#3B82F6' : '#374151' }}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <label style={{ marginBottom: 8 }}>Mensagem <span style={{ fontWeight: 400, color: '#9CA3AF' }}>({'{nome}'} = nome do aluno)</span></label>
              <textarea
                value={massMessage}
                onChange={e => setMassMessage(e.target.value)}
                placeholder="Ex: Olá {nome}, passando para lembrar da sua aula amanhã!"
                rows={5}
                style={{ resize: 'vertical', marginBottom: 12 }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 12px', background: '#F9FAFB', borderRadius: 8, fontSize: 12, color: '#6B7280' }}>
                <Users size={14} color="#3B82F6" />
                {students.filter(s => s.phone).length} alunos com telefone cadastrado
                {students.filter(s => !s.phone).length > 0 && (
                  <span style={{ color: '#F59E0B' }}>· {students.filter(s => !s.phone).length} sem telefone</span>
                )}
              </div>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleGenerateLinks} disabled={!massMessage.trim() || students.filter(s => s.phone).length === 0}>
                <ChevronRight size={15} /> Gerar links de envio
              </button>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10, background: '#25D366' }}>
              <Users size={20} color="white" />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'white' }}>Envio em massa</h3>
              {massLinks.length > 0 && (
                <>
                  <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 12 }}>
                    {massLinks.filter(l => l.opened).length}/{massLinks.length}
                  </span>
                  <button onClick={openAll} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: 'white', fontSize: 12, fontWeight: 700, padding: '5px 12px', cursor: 'pointer' }}>
                    <ExternalLink size={13} /> Abrir todos
                  </button>
                </>
              )}
            </div>

            {massLinks.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', background: '#ECE5DD' }}>
                <Users size={40} color="rgba(0,0,0,0.15)" style={{ marginBottom: 12 }} />
                <p style={{ margin: 0, fontSize: 14, color: 'rgba(0,0,0,0.4)', fontWeight: 500 }}>Escreva a mensagem e clique em "Gerar links"</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(0,0,0,0.3)' }}>Cada aluno terá um link com o nome personalizado</p>
              </div>
            ) : (
              <div style={{ maxHeight: 520, overflowY: 'auto', background: '#ECE5DD', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {massLinks.map((l, i) => (
                  <div key={l.student.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: l.opened ? '#F0FDF4' : 'white', borderRadius: 10, padding: '10px 14px', border: `1px solid ${l.opened ? '#86EFAC' : '#E5E7EB'}` }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: colorForName(l.student.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                      {getInitials(l.student.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827' }}>{l.student.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.msg.slice(0, 60)}…</p>
                    </div>
                    {l.opened
                      ? <CheckCheck size={18} color="#10B981" />
                      : (
                        <button onClick={() => openLink(i)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#25D366', border: 'none', borderRadius: 8, color: 'white', fontSize: 12, fontWeight: 700, padding: '6px 12px', cursor: 'pointer', flexShrink: 0 }}>
                          <ExternalLink size={13} /> Abrir
                        </button>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* INDIVIDUAL MODE */}
      {mode === 'individual' && (
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
        {/* Left: Templates + Send form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#111827' }}>Templates de Mensagem</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messageTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateSelect(t)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                    border: `1px solid ${selectedTemplate?.id === t.id ? '#3B82F6' : '#E5E7EB'}`,
                    background: selectedTemplate?.id === t.id ? '#EFF6FF' : 'white',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: selectedTemplate?.id === t.id ? '#3B82F6' : '#111827' }}>{t.name}</span>
                    <button
                      onClick={e => { e.stopPropagation(); handleCopy(t.message, t.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 2 }}
                      title="Copiar"
                    >
                      {copiedId === t.id ? <CheckCheck size={14} color="#10B981" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: '#6B7280', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {t.message}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#111827' }}>Enviar Mensagem</h3>
            {loadingStudents ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                <Loader size={20} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <form onSubmit={handleSend}>
                <div style={{ marginBottom: 12 }}>
                  <label>Aluno *</label>
                  <select value={selectedStudentId} onChange={handleStudentChange} required>
                    <option value="">Selecione o aluno...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name}{s.phone ? '' : ' (sem tel.)'}</option>
                    ))}
                  </select>
                  {students.length === 0 && <p style={{ fontSize: 11, color: '#F59E0B', margin: '4px 0 0' }}>Nenhum aluno ativo cadastrado</p>}
                  {selectedStudent && selectedStudent.phone && (
                    <p style={{ fontSize: 11, color: '#10B981', margin: '4px 0 0' }}>📱 {selectedStudent.phone} — abrirá o WhatsApp</p>
                  )}
                  {selectedStudent && !selectedStudent.phone && (
                    <p style={{ fontSize: 11, color: '#F59E0B', margin: '4px 0 0' }}>⚠️ Aluno sem telefone cadastrado</p>
                  )}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label>Mensagem *</label>
                  <textarea
                    value={customMessage}
                    onChange={e => setCustomMessage(e.target.value)}
                    placeholder="Digite ou selecione um template acima..."
                    rows={4}
                    required
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {success && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#D1FAE5', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                    <CheckCheck size={16} color="#059669" />
                    <span style={{ fontSize: 13, color: '#065F46', fontWeight: 500 }}>
                      {selectedStudent?.phone ? 'WhatsApp aberto!' : 'Mensagem copiada!'}
                    </span>
                  </div>
                )}

                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', opacity: sending ? 0.7 : 1 }} disabled={sending}>
                  <Send size={16} />
                  {sending ? 'Abrindo...' : selectedStudent?.phone ? 'Abrir WhatsApp' : 'Registrar mensagem'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right: History */}
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10, background: '#25D366' }}>
            <MessageSquare size={20} color="white" />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'white' }}>Mensagens desta sessão</h3>
            <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 12 }}>
              {sent.length}
            </span>
          </div>

          <div style={{ padding: sent.length > 0 ? 20 : 0, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 560, overflowY: 'auto', background: '#ECE5DD' }}>
            {sent.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', background: '#ECE5DD' }}>
                <MessageSquare size={40} color="rgba(0,0,0,0.15)" style={{ marginBottom: 12 }} />
                <p style={{ margin: 0, fontSize: 14, color: 'rgba(0,0,0,0.4)', fontWeight: 500 }}>Nenhuma mensagem enviada ainda</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(0,0,0,0.3)' }}>Selecione um aluno e um template para começar</p>
              </div>
            ) : sent.map(msg => {
              const color = colorForName(msg.studentName);
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, maxWidth: '85%' }}>
                    <div style={{ background: '#DCF8C6', borderRadius: '12px 12px 2px 12px', padding: '10px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                          {getInitials(msg.studentName)}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#075E54' }}>{msg.studentName}</span>
                        <span style={{ fontSize: 10, background: '#EFF6FF', color: '#3B82F6', padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>
                          {msg.template}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 14, color: '#111827', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.message}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, justifyContent: 'flex-end' }}>
                        <Clock size={10} color="#6B7280" />
                        <span style={{ fontSize: 11, color: '#6B7280' }}>{msg.sentAt}</span>
                        <CheckCheck size={12} color="#34B7F1" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* NOTIFICATION MODE */}
      {mode === 'notificacao' && (
        <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 20 }}>
          {/* Left: Compose */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <BellRing size={18} color="#8B5CF6" />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Enviar notificação push</h3>
              </div>
              <p style={{ margin: '0 0 16px', fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>
                A notificação aparece direto no celular do aluno, mesmo com o app fechado (desde que o aluno tenha ativado as notificações).
              </p>

              <div style={{ marginBottom: 12 }}>
                <label>Título *</label>
                <input
                  type="text"
                  value={notifTitle}
                  onChange={e => setNotifTitle(e.target.value)}
                  placeholder="Ex: Treino de hoje disponível!"
                  maxLength={80}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label>Mensagem *</label>
                <textarea
                  value={notifMessage}
                  onChange={e => setNotifMessage(e.target.value)}
                  placeholder="Ex: Seu treino A está pronto. Bora treinar! 💪"
                  rows={4}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label>Destinatários</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 500 }}>
                    <input
                      type="radio"
                      checked={notifStudentIds.length === 0}
                      onChange={() => setNotifStudentIds([])}
                      style={{ accentColor: '#8B5CF6', width: 'auto', margin: 0 }}
                    />
                    Todos os alunos ({students.length})
                  </label>
                  {students.map(s => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 500 }}>
                      <input
                        type="checkbox"
                        checked={notifStudentIds.includes(String(s.id))}
                        onChange={e => {
                          const id = String(s.id);
                          setNotifStudentIds(prev =>
                            e.target.checked ? [...prev, id] : prev.filter(x => x !== id)
                          );
                        }}
                        style={{ accentColor: '#8B5CF6', width: 'auto', margin: 0 }}
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>

              {notifResult && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: notifResult.ok ? '#D1FAE5' : '#FEE2E2', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                  {notifResult.ok ? <CheckCheck size={16} color="#059669" /> : <Bell size={16} color="#DC2626" />}
                  <span style={{ fontSize: 13, color: notifResult.ok ? '#065F46' : '#991B1B', fontWeight: 500 }}>{notifResult.message}</span>
                </div>
              )}

              <button
                onClick={handleSendNotification}
                disabled={notifSending || !notifTitle.trim() || !notifMessage.trim()}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '10px 16px', background: '#8B5CF6', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: notifSending ? 'not-allowed' : 'pointer', opacity: notifSending ? 0.7 : 1 }}
              >
                {notifSending ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <BellRing size={16} />}
                {notifSending ? 'Enviando...' : 'Enviar notificação'}
              </button>
            </div>
          </div>

          {/* Right: Info */}
          <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#111827' }}>Como funciona</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { step: '1', title: 'Aluno ativa notificações', desc: 'Quando o aluno abre o app, um banner aparece pedindo para ativar as notificações. Após aceitar, o celular fica registrado.' },
                { step: '2', title: 'Personal envia mensagem', desc: 'Aqui no painel, escreva o título e a mensagem e escolha para quais alunos enviar.' },
                { step: '3', title: 'Notificação chega no celular', desc: 'A notificação aparece na tela do aluno mesmo com o app fechado, como qualquer outra notificação do celular.' },
              ].map(({ step, title, desc }) => (
                <div key={step} style={{ display: 'flex', gap: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#8B5CF6', flexShrink: 0 }}>{step}</div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>{title}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, padding: '14px 16px', background: '#FFF7ED', borderRadius: 10, border: '1px solid #FED7AA' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#92400E' }}>Configuração necessária</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#B45309', lineHeight: 1.5 }}>
                Para notificações chegarem quando o app está fechado, adicione <code>VITE_VAPID_PUBLIC_KEY</code> no .env.local e faça o deploy da Edge Function <code>send-push</code> no Supabase.
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
