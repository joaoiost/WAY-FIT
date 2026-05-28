import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function Privacidade() {
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
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '0 0 6px' }}>Política de Privacidade</h1>
        <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 40px' }}>Última atualização: maio de 2026 · Em conformidade com a LGPD (Lei nº 13.709/2018)</p>

        <Section title="1. Quem somos">
          <p>O WAY FIT é uma plataforma de gestão para personal trainers e alunos. Nós levamos a privacidade dos nossos usuários a sério e nos comprometemos a proteger seus dados pessoais conforme a Lei Geral de Proteção de Dados (LGPD).</p>
        </Section>

        <Section title="2. Dados que coletamos">
          <p><strong>Personal trainer:</strong></p>
          <ul>
            <li>Nome, e-mail e telefone (cadastro)</li>
            <li>Foto de perfil (opcional)</li>
            <li>Dados de pagamento da assinatura (processados por terceiros)</li>
          </ul>
          <p><strong>Aluno:</strong></p>
          <ul>
            <li>Nome, e-mail e telefone</li>
            <li>Dados de saúde: anamnese, medidas corporais, percentual de gordura</li>
            <li>Fotos de progresso (enviadas voluntariamente)</li>
            <li>Histórico de treinos e frequência</li>
            <li>Avaliações de sessão (feedback)</li>
          </ul>
          <p><strong>Dados coletados automaticamente:</strong></p>
          <ul>
            <li>Endereço IP e informações do dispositivo (para segurança)</li>
            <li>Logs de acesso e uso da plataforma</li>
          </ul>
        </Section>

        <Section title="3. Dados sensíveis — saúde">
          <p>Informações de saúde (anamnese, medidas, condições médicas) são classificadas como <strong>dados sensíveis</strong> pela LGPD. Esses dados são coletados apenas com seu consentimento explícito, armazenados de forma segura e acessados exclusivamente pelo personal trainer responsável pela sua conta.</p>
          <p>Esses dados <strong>nunca são compartilhados com terceiros</strong> sem sua autorização.</p>
        </Section>

        <Section title="4. Como usamos seus dados">
          <p>Utilizamos seus dados para:</p>
          <ul>
            <li>Fornecer as funcionalidades da plataforma (treinos, agenda, financeiro, chat);</li>
            <li>Comunicações sobre sua conta e atualizações do serviço;</li>
            <li>Envio de notificações relacionadas ao seu treino (com sua permissão);</li>
            <li>Melhorias na plataforma (dados agregados e anonimizados);</li>
            <li>Cumprir obrigações legais.</li>
          </ul>
          <p>Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins de marketing.</p>
        </Section>

        <Section title="5. Compartilhamento de dados">
          <p>Seus dados podem ser compartilhados apenas com:</p>
          <ul>
            <li><strong>Supabase</strong> — infraestrutura de banco de dados e autenticação (servidores na AWS);</li>
            <li><strong>Vercel</strong> — hospedagem da aplicação;</li>
            <li>Autoridades competentes, quando exigido por lei.</li>
          </ul>
          <p>Todos os fornecedores são contratados mediante cláusulas de confidencialidade e proteção de dados.</p>
        </Section>

        <Section title="6. Armazenamento e segurança">
          <p>Seus dados são armazenados em servidores seguros com criptografia em trânsito (HTTPS/TLS) e em repouso. Utilizamos autenticação segura e controle de acesso baseado em perfis (personal trainer acessa apenas os dados dos seus próprios alunos).</p>
          <p>Mantemos os dados enquanto a conta estiver ativa. Após o cancelamento, os dados são mantidos por até 90 dias para fins de backup e depois excluídos permanentemente.</p>
        </Section>

        <Section title="7. Seus direitos (LGPD)">
          <p>Como titular dos dados, você tem direito a:</p>
          <ul>
            <li><strong>Confirmar</strong> se tratamos seus dados;</li>
            <li><strong>Acessar</strong> os dados que temos sobre você;</li>
            <li><strong>Corrigir</strong> dados incompletos ou desatualizados;</li>
            <li><strong>Solicitar a exclusão</strong> dos seus dados pessoais;</li>
            <li><strong>Revogar o consentimento</strong> a qualquer momento;</li>
            <li><strong>Portabilidade</strong> dos seus dados em formato legível.</li>
          </ul>
          <p>Para exercer qualquer desses direitos, entre em contato pelo e-mail abaixo.</p>
        </Section>

        <Section title="8. Cookies">
          <p>Utilizamos apenas cookies essenciais para o funcionamento da plataforma (autenticação e sessão). Não utilizamos cookies de rastreamento ou publicidade.</p>
        </Section>

        <Section title="9. Menores de idade">
          <p>O WAY FIT não é destinado a menores de 18 anos. Não coletamos intencionalmente dados de menores. Caso identifiquemos isso, excluiremos os dados imediatamente.</p>
        </Section>

        <Section title="10. Contato e DPO">
          <p>Para dúvidas, solicitações ou reclamações relacionadas à privacidade dos seus dados, entre em contato:</p>
          <p><strong>E-mail:</strong> privacidade@wayfit.app<br />
          Respondemos em até 15 dias úteis, conforme previsto na LGPD.</p>
        </Section>

        <Section title="11. Alterações nesta política">
          <p>Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos os usuários por e-mail ou através da plataforma. O uso continuado após a notificação implica na aceitação das mudanças.</p>
        </Section>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #E5E7EB', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link to="/termos" style={{ color: '#3B82F6', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Termos de Uso →</Link>
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
