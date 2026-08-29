import { useAuth } from '../../context/AuthContext';

export default function DashboardV2() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || '';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-ink-900">Olá, {firstName || 'personal'}!</h2>
        <p className="text-sm text-ink-500 mt-0.5">Essa é a nova estrutura do painel — as próximas telas vão nascer aqui dentro.</p>
      </div>

      <div className="bg-white border border-ink-100 rounded-xl p-5">
        <p className="text-sm text-ink-500">
          Menu lateral e cabeçalho prontos. Próximo passo: reescrever Treinos e Nutrição com um fluxo mais simples.
        </p>
      </div>
    </div>
  );
}
