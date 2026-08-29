import { Link, useLocation } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { useNotifications } from '../../../context/NotificationsContext';

const TITLES = {
  '/v2/dashboard': 'Início',
  '/v2/alunos': 'Alunos',
  '/v2/treinos': 'Treinos',
  '/v2/cartilhas': 'Cartilhas',
  '/v2/turmas': 'Turmas',
  '/v2/nutricao': 'Planos Alimentares',
  '/v2/nutricao/alimentos': 'Banco de Alimentos',
  '/v2/chat': 'Chat',
  '/v2/frequencia': 'Frequência',
  '/v2/financeiro': 'Financeiro',
  '/v2/notificacoes': 'Notificações',
  '/v2/perfil': 'Meu Perfil',
  '/v2/configuracoes': 'Configurações',
};

export default function HeaderV2({ onMenuClick }) {
  const { pathname } = useLocation();
  const { unread } = useNotifications();
  const title = TITLES[pathname] || (pathname.startsWith('/v2/alunos/') ? 'Ficha do Aluno' : 'WAY FIT');

  return (
    <header className="h-16 shrink-0 border-b border-ink-100 bg-white flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-ink-500 hover:bg-ink-50"
          aria-label="Abrir menu"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-[15px] font-semibold text-ink-900">{title}</h1>
      </div>

      <Link
        to="/v2/notificacoes"
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-ink-500 hover:bg-ink-50 transition-colors"
        aria-label={unread > 0 ? `Notificações (${unread} não lidas)` : 'Notificações'}
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger-500" />
        )}
      </Link>
    </header>
  );
}
