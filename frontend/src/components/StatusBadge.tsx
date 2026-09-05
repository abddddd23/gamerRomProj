export function StatusBadge({ value }: { value: string }) {
  const normalized = value.replace(/_/g, "-").toLowerCase();
  const label = value.replace(/_/g, " ");
  return <span className={`badge badge-${normalized}`}>{label}</span>;
}
