import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function Termos() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={15} color="white" fill="white" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>WAY FIT</span>
        </div>
        <Link to="/login" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none' }}>← Voltar</Link>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '0 0 6px' }}>Termos de Uso</h1>
        <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 40px' }}>Última atualização: maio de 2026</p>

        <Section title="1. Sobre o WAY FIT">
          <p>O WAY FIT é uma plataforma de gestão para personal trainers e seus alunos, que permite o gerenciamento de treinos, agendamentos, pagamentos e acompanhamento de progresso físico. O acesso à plataforma está sujeito à aceitação integral destes Termos de Uso.</p>
        </Section>

        <Section title="2. Aceitação dos Termos">
          <p>Ao criar uma conta e utilizar o WAY FIT, você declara que leu, compreendeu e concorda com estes Termos de Uso e com nossa Política de Privacidade. Caso não concorde, não utilize a plataforma.</p>
        </Section>

        <Section title="3. Responsabilidades do Personal Trainer">
          <p>O personal trainer é o único responsável por:</p>
          <ul>
            <li>Os treinos, cargas e exercícios prescritos aos alunos;</li>
            <li>Avaliações físicas e recomendações de saúde feitas dentro da plataforma;</li>
            <li>Verificar as condições de saúde do aluno antes de iniciar qualquer programa de treinamento;</li>
            <li>Manter suas informações cadastrais atualizadas e verídicas;</li>
            <li>Garantir que possui habilitação profissional adequada (CREF ou equivalente) para exercer a função.</li>
          </ul>
          <p>O WAY FIT é uma ferramenta de gestão e organização — não substitui a responsabilidade profissional do personal trainer.</p>
        </Section>

        <Section title="4. Responsabilidades do Aluno">
          <p>O aluno é responsável por:</p>
          <ul>
            <li>Informar ao personal trainer suas condições de saúde, limitações físicas e histórico médico;</li>
            <li>Consultar um médico antes de iniciar qualquer programa de exercícios físicos;</li>
            <li>Executar os exercícios sob orientação e responsabilidade do personal contratado;</li>
            <li>Manter seus dados cadastrais corretos e atualizados.</li>
          </ul>
        </Section>

        <Section title="5. Isenção de Responsabilidade — Saúde">
          <p>O WAY FIT <strong>não presta serviços médicos, de nutrição ou de fisioterapia</strong>. As informações presentes na plataforma (treinos, medidas, anamnese) são inseridas pelos usuários e não constituem diagnóstico médico nem substituem consulta a profissionais de saúde.</p>
          <p>O WAY FIT não se responsabiliza por lesões, danos à saúde ou complicações decorrentes da prática de exercícios físicos realizados com base em informações inseridas na plataforma.</p>
        </Section>

        <Section title="6. Pagamentos e Assinaturas">
          <p>O WAY FIT é uma plataforma de software como serviço (SaaS). Os valores cobrados pelo personal trainer aos seus alunos são de responsabilidade exclusiva do personal. O WAY FIT não é parte nessa relação comercial e não realiza cobranças em nome do personal trainer.</p>
          <p>O uso da plataforma pelo personal trainer pode estar sujeito a uma assinatura mensal, cujos valores e condições serão informados no momento da contratação.</p>
        </Section>

        <Section title="7. Propriedade Intelectual">
          <p>Todo o conteúdo da plataforma (interface, código, marca, logotipo) é de propriedade do WAY FIT. É proibida a reprodução, cópia ou distribuição sem autorização expressa.</p>
          <p>Os dados inseridos pelos usuários (treinos, informações dos alunos) pertencem ao personal trainer responsável pela conta.</p>
        </Section>

        <Section title="8. Suspensão e Cancelamento">
          <p>O WAY FIT reserva-se o direito de suspender ou encerrar contas que:</p>
          <ul>
            <li>Violem estes Termos de Uso;</li>
            <li>Utilizem a plataforma para fins ilegais ou prejudiciais a terceiros;</li>
            <li>Estejam inadimplentes com pagamentos da assinatura.</li>
          </ul>
          <p>O usuário pode cancelar sua conta a qualquer momento entrando em contato com o suporte.</p>
        </Section>

        <Section title="9. Alterações nos Termos">
          <p>O WAY FIT pode atualizar estes Termos de Uso a qualquer momento. As alterações serão comunicadas através da plataforma. O uso continuado após a notificação implica na aceitação dos novos termos.</p>
        </Section>

        <Section title="10. Legislação Aplicável">
          <p>Estes Termos de Uso são regidos pela legislação brasileira. Fica eleito o foro da comarca de domicílio do usuário para resolução de eventuais conflitos, conforme o Código de Defesa do Consumidor.</p>
        </Section>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #E5E7EB', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link to="/privacidade" style={{ color: '#3B82F6', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Política de Privacidade →</Link>
          <Link to="/login" style={{ color: '#6B7280', textDecoration: 'none', fontSize: 14 }}>Voltar ao app</Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>{title}</h2>
      <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
        {children}
      </div>
    </div>
  );
}
