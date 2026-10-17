export function Avatar({
  name,
  emoji,
  color,
}: {
  name: string;
  emoji?: string;
  color?: string;
}) {
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={color ? { borderColor: color } : undefined}
    >
      {emoji || name.trim().slice(0, 2).toUpperCase()}
    </span>
  );
}
