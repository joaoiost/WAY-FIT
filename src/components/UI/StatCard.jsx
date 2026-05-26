export default function StatCard({ title, value, change, changeLabel, icon: Icon, iconBg }) {
  const isPositive = change && change > 0;

  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, color: '#6B7280', fontWeight: 500 }}>{title}</p>
          <p style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 800, color: '#111827' }}>{value}</p>
        </div>
        {Icon && (
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: iconBg || '#EFF6FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon size={22} color={iconBg ? 'white' : '#3B82F6'} />
          </div>
        )}
      </div>
      {change !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: isPositive ? '#10B981' : '#EF4444',
          }}>
            {isPositive ? '+' : ''}{change}{changeLabel?.includes('%') ? '' : ''}
          </span>
          <span style={{ fontSize: 13, color: '#6B7280' }}>{changeLabel || 'este mês'}</span>
        </div>
      )}
    </div>
  );
}
