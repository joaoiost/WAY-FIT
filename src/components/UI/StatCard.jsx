export default function StatCard({ title, value, change, changeLabel, icon: Icon, iconBg }) {
  const isPositive = change && change > 0;

  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-500)', fontWeight: 500 }}>{title}</p>
          <p style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 800, color: 'var(--gray-900)' }}>{value}</p>
        </div>
        {Icon && (
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: iconBg || 'var(--accent-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={22} color={iconBg ? 'white' : 'var(--accent)'} />
          </div>
        )}
      </div>
      {change !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: isPositive ? 'var(--green)' : 'var(--red)' }}>
            {isPositive ? '+' : ''}{change}
          </span>
          <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>{changeLabel || 'este mês'}</span>
        </div>
      )}
    </div>
  );
}
