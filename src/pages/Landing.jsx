import { Link } from 'react-router-dom';
import { Zap, Check, ChevronDown, Star, Users, Calendar, Dumbbell, DollarSign, MessageSquare, TrendingUp, Shield, Smartphone, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { plans, faqs } from '../data/mockData';

function Navbar() {
  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: 'rgba(15,23,42,0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      padding: '0 48px',
      height: 72,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Zap size={20} color="white" fill="white" />
        </div>
        <span style={{ fontSize: 22, fontWeight: 800, background: 'var(--accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          WAY FIT
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        {['Benefícios', 'Funcionalidades', 'Planos', 'FAQ'].map(item => (
          <a key={item} href={`#${item.toLowerCase()}`} style={{
            color: 'rgba(255,255,255,0.8)',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 500,
            transition: 'color 0.2s',
          }}
            onMouseEnter={e => e.target.style.color = 'white'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
          >
            {item}
          </a>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to="/login" style={{
          color: 'rgba(255,255,255,0.8)',
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 500,
          padding: '8px 16px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.2)',
          transition: 'all 0.2s',
        }}>
          Entrar
        </Link>
        <Link to="/registro" style={{
          padding: '8px 20px',
          borderRadius: 8,
          background: 'var(--accent)',
          color: 'white',
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 600,
        }}>
          Começar grátis
        </Link>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section style={{
      background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 72,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow effects */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '10%',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '10%',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1100, width: '100%', padding: '0 48px', display: 'flex', alignItems: 'center', gap: 64, position: 'relative', zIndex: 1 }}>
        {/* Left content */}
        <div style={{ flex: 1 }}>
          {/* Social proof */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 20,
            padding: '6px 14px',
            marginBottom: 28,
          }}>
            <div style={{ display: 'flex' }}>
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={12} fill="#F59E0B" color="#F59E0B" />
              ))}
            </div>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
              +500 personals já usam · 4.9/5 de avaliação
            </span>
          </div>

          <h1 style={{
            fontSize: 56,
            fontWeight: 900,
            lineHeight: 1.1,
            color: 'white',
            margin: '0 0 20px',
            letterSpacing: '-0.02em',
          }}>
            Gerencie seus{' '}
            <span style={{
              background: 'var(--accent)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              alunos
            </span>
            {' '}com inteligência
          </h1>

          <p style={{
            fontSize: 18,
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.7,
            margin: '0 0 36px',
            maxWidth: 480,
          }}>
            A plataforma completa para personal trainers que querem profissionalizar sua gestão, aumentar receita e oferecer a melhor experiência aos alunos.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
            <Link to="/registro" style={{
              padding: '14px 28px',
              borderRadius: 10,
              background: 'var(--accent)',
              color: 'white',
              textDecoration: 'none',
              fontSize: 16,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 20px rgba(59,130,246,0.4)',
            }}>
              Começar grátis
              <ChevronRight size={18} />
            </Link>
            <Link to="/login" style={{
              padding: '14px 28px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              textDecoration: 'none',
              fontSize: 16,
              fontWeight: 600,
            }}>
              Ver demo
            </Link>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {['14 dias grátis', 'Sem cartão', 'Cancele quando quiser'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Check size={10} color="white" strokeWidth={3} />
                </div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: App mockup */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20,
            padding: 20,
            width: '100%',
            maxWidth: 420,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            {/* Mock browser bar */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {['#EF4444', '#F59E0B', '#10B981'].map((c, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
              ))}
            </div>

            {/* Mock dashboard */}
            <div style={{ background: '#0F172A', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ height: 8, width: 120, background: 'rgba(255,255,255,0.2)', borderRadius: 4, marginBottom: 6 }} />
                  <div style={{ height: 6, width: 80, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                </div>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)' }} />
              </div>

              {/* Stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Alunos', value: '28', color: '#3B82F6' },
                  { label: 'Aulas', value: '5', color: '#10B981' },
                  { label: 'Receita', value: 'R$4.2k', color: '#8B5CF6' },
                ].map(card => (
                  <div key={card.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 10, borderTop: `2px solid ${card.color}` }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{card.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{card.value}</div>
                  </div>
                ))}
              </div>

              {/* List items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { name: 'Carlos Souza', time: '08:00', status: 'Concluído', color: '#10B981' },
                  { name: 'Lucas Mendes', time: '09:00', status: 'Concluído', color: '#10B981' },
                  { name: 'Ana Beatriz', time: '10:30', status: 'Em andamento', color: '#3B82F6' },
                  { name: 'Rafael Costa', time: '14:00', status: 'Pendente', color: '#F59E0B' },
                ].map(item => (
                  <div key={item.name} style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', fontSize: 9, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        {item.name.split(' ').map(w => w[0]).join('')}
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{item.time}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 9, background: `${item.color}20`, color: item.color, padding: '2px 6px', borderRadius: 10, fontWeight: 600 }}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const items = [
    { icon: Users, title: 'Gestão de Alunos', desc: 'Gerencie todos os seus alunos em um único lugar. Histórico, planos, evolução e muito mais.' },
    { icon: Calendar, title: 'Agenda Inteligente', desc: 'Organize suas aulas e sessões com uma agenda intuitiva. Nunca mais perca um compromisso.' },
    { icon: Dumbbell, title: 'Treinos Personalizados', desc: 'Crie e envie treinos completos para cada aluno com exercícios, séries e repetições.' },
    { icon: DollarSign, title: 'Controle Financeiro', desc: 'Acompanhe receitas, mensalidades e pagamentos pendentes em um só dashboard.' },
    { icon: MessageSquare, title: 'WhatsApp Integrado', desc: 'Envie lembretes e mensagens automáticas para seus alunos diretamente pelo WhatsApp.' },
    { icon: TrendingUp, title: 'Relatórios e Métricas', desc: 'Acompanhe o crescimento do seu negócio com gráficos e relatórios detalhados.' },
  ];

  return (
    <section id="benefícios" style={{ background: '#F8FAFC', padding: '96px 48px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <span style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))',
            border: '1px solid rgba(59,130,246,0.2)',
            color: '#3B82F6',
            fontSize: 13,
            fontWeight: 700,
            padding: '6px 16px',
            borderRadius: 20,
            marginBottom: 16,
          }}>
            BENEFÍCIOS
          </span>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: '#111827', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            Tudo que você precisa para{' '}
            <span style={{ background: 'var(--accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              crescer
            </span>
          </h2>
          <p style={{ fontSize: 18, color: '#6B7280', maxWidth: 520, margin: '0 auto' }}>
            Uma plataforma completa que substitui planilhas, aplicativos separados e processos manuais.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {items.map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{
              background: 'white',
              borderRadius: 16,
              padding: 28,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid #F1F5F9',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'default',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(59,130,246,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; }}
            >
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}>
                <Icon size={24} color="white" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>{title}</h3>
              <p style={{ fontSize: 15, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="funcionalidades" style={{ background: 'white', padding: '96px 48px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <span style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))',
            border: '1px solid rgba(59,130,246,0.2)',
            color: '#3B82F6',
            fontSize: 13,
            fontWeight: 700,
            padding: '6px 16px',
            borderRadius: 20,
            marginBottom: 16,
          }}>
            FUNCIONALIDADES
          </span>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: '#111827', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            Projetado para{' '}
            <span style={{ background: 'var(--accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              personal trainers
            </span>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center', marginBottom: 64 }}>
          <div>
            <h3 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>
              Dashboard completo e intuitivo
            </h3>
            <p style={{ fontSize: 16, color: '#6B7280', margin: '0 0 24px', lineHeight: 1.7 }}>
              Visualize todos os seus indicadores em um só lugar. Alunos ativos, aulas de hoje, receita mensal e muito mais, de forma clara e organizada.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {['Visão geral em tempo real', 'Agenda do dia na tela inicial', 'Alunos recentes e status', 'Notificações importantes'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={12} color="white" strokeWidth={3} />
                  </div>
                  <span style={{ fontSize: 15, color: '#374151', fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)',
            borderRadius: 20,
            padding: 32,
            border: '1px solid #DBEAFE',
            minHeight: 280,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            {[
              { label: 'Alunos Ativos', value: '28', change: '+3', color: '#3B82F6' },
              { label: 'Aulas Hoje', value: '5', change: '+1', color: '#10B981' },
              { label: 'Receita/mês', value: 'R$ 4.280', change: '+12%', color: '#8B5CF6' },
            ].map(card => (
              <div key={card.label} style={{
                background: 'white',
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                <span style={{ fontSize: 14, color: '#6B7280', fontWeight: 500 }}>{card.label}</span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{card.value}</span>
                  <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600, marginLeft: 8 }}>{card.change}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {[
            { icon: Shield, title: 'Dados Seguros', desc: 'Criptografia de ponta a ponta e conformidade com LGPD.' },
            { icon: Smartphone, title: 'Área do Aluno', desc: 'Seus alunos têm acesso a treinos e agenda pelo celular.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{
              background: '#F8FAFC',
              borderRadius: 16,
              padding: 28,
              display: 'flex',
              gap: 20,
              border: '1px solid #F1F5F9',
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={22} color="white" />
              </div>
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#111827' }}>{title}</h4>
                <p style={{ margin: 0, fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Plans() {
  return (
    <section id="planos" style={{ background: '#F8FAFC', padding: '96px 48px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <span style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))',
            border: '1px solid rgba(59,130,246,0.2)',
            color: '#3B82F6',
            fontSize: 13,
            fontWeight: 700,
            padding: '6px 16px',
            borderRadius: 20,
            marginBottom: 16,
          }}>
            PLANOS
          </span>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: '#111827', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            Escolha o plano ideal
          </h2>
          <p style={{ fontSize: 18, color: '#6B7280' }}>Comece grátis por 14 dias. Sem cartão de crédito.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {plans.map((plan, i) => {
            const isPro = plan.name === 'Pro';
            return (
              <div key={plan.name} style={{
                background: isPro ? 'linear-gradient(135deg, #1E40AF, #6D28D9)' : 'white',
                borderRadius: 20,
                padding: 32,
                boxShadow: isPro ? '0 16px 48px rgba(59,130,246,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
                border: isPro ? 'none' : '1px solid #F1F5F9',
                position: 'relative',
                transform: isPro ? 'scale(1.05)' : 'scale(1)',
              }}>
                {isPro && (
                  <div style={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 16px',
                    borderRadius: 20,
                    whiteSpace: 'nowrap',
                  }}>
                    MAIS POPULAR
                  </div>
                )}
                <h3 style={{ fontSize: 22, fontWeight: 800, color: isPro ? 'white' : '#111827', margin: '0 0 8px' }}>
                  {plan.name}
                </h3>
                <div style={{ margin: '0 0 24px' }}>
                  <span style={{ fontSize: 40, fontWeight: 900, color: isPro ? 'white' : '#111827' }}>
                    R${plan.price}
                  </span>
                  <span style={{ fontSize: 14, color: isPro ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>/mês</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: isPro ? 'rgba(255,255,255,0.2)' : 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 1,
                      }}>
                        <Check size={10} color="white" strokeWidth={3} />
                      </div>
                      <span style={{ fontSize: 14, color: isPro ? 'rgba(255,255,255,0.9)' : '#374151', lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link to="/registro" style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '12px',
                  borderRadius: 10,
                  background: isPro ? 'rgba(255,255,255,0.2)' : 'var(--accent)',
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: 15,
                  fontWeight: 700,
                  border: isPro ? '1px solid rgba(255,255,255,0.3)' : 'none',
                }}>
                  Começar grátis
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState(null);
  return (
    <section id="faq" style={{ background: 'white', padding: '96px 48px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <span style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))',
            border: '1px solid rgba(59,130,246,0.2)',
            color: '#3B82F6',
            fontSize: 13,
            fontWeight: 700,
            padding: '6px 16px',
            borderRadius: 20,
            marginBottom: 16,
          }}>
            FAQ
          </span>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: '#111827', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            Perguntas frequentes
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {faqs.map((item, i) => (
            <div key={i} style={{
              border: '1px solid',
              borderColor: open === i ? '#DBEAFE' : '#F1F5F9',
              borderRadius: 12,
              overflow: 'hidden',
              background: open === i ? '#F0F9FF' : 'white',
            }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '18px 24px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{item.q}</span>
                <ChevronDown
                  size={20}
                  color="#6B7280"
                  style={{ transform: open === i ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0, marginLeft: 16 }}
                />
              </button>
              {open === i && (
                <div style={{ padding: '0 24px 18px' }}>
                  <p style={{ margin: 0, fontSize: 15, color: '#6B7280', lineHeight: 1.7 }}>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{
      background: '#0F172A',
      padding: '64px 48px 32px',
      color: 'rgba(255,255,255,0.6)',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 48, flexWrap: 'wrap', gap: 32 }}>
          <div style={{ maxWidth: 280 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={16} color="white" fill="white" />
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, background: 'var(--accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                WAY FIT
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>
              A plataforma que personal trainers profissionais usam para gerenciar seus negócios com inteligência.
            </p>
          </div>

          {[
            { title: 'Produto', links: ['Benefícios', 'Funcionalidades', 'Planos', 'FAQ'] },
            { title: 'Suporte', links: ['Central de Ajuda', 'Contato', 'Status', 'Comunidade'] },
            { title: 'Legal', links: ['Privacidade', 'Termos de Uso', 'LGPD', 'Cookies'] },
          ].map(col => (
            <div key={col.title}>
              <h4 style={{ color: 'white', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>{col.title}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(link => (
                  <a key={link} href="#" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 14 }}>{link}</a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 32, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 14 }}>© 2026 WAY FIT. Todos os direitos reservados.</p>
          <p style={{ margin: 0, fontSize: 14 }}>Desenvolvido para personal trainers brasileiros</p>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div>
      <Navbar />
      <Hero />
      <Benefits />
      <Features />
      <Plans />
      <FAQ />
      <Footer />
    </div>
  );
}
