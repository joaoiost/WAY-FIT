export default function Badge({ status }) {
  const map = {
    ativo: 'badge badge-green',
    pendente: 'badge badge-yellow',
    atrasado: 'badge badge-red',
    pago: 'badge badge-green',
    done: 'badge badge-green',
    'in-progress': 'badge badge-blue',
    inactive: 'badge badge-red',
  };
  const labels = {
    ativo: 'Ativo',
    pendente: 'Pendente',
    atrasado: 'Atrasado',
    pago: 'Pago',
    done: 'Concluído',
    'in-progress': 'Em andamento',
    inactive: 'Inativo',
  };
  return (
    <span className={map[status] || 'badge badge-yellow'}>
      {labels[status] || status}
    </span>
  );
}
