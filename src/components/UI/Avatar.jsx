export default function Avatar({ initials, color, size = 40 }) {
  return (
    <div
      className="avatar"
      style={{
        backgroundColor: color || '#3B82F6',
        width: size,
        height: size,
        fontSize: size * 0.35,
      }}
    >
      {initials}
    </div>
  );
}
