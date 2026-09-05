import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

type StatTone = "neutral" | "success" | "warning" | "danger" | "info";

interface StatCardProps {
  title: string;
  value: ReactNode;
  detail?: string;
  icon?: LucideIcon;
  tone?: StatTone;
}

export function StatCard({ title, value, detail, icon: Icon, tone = "neutral" }: StatCardProps) {
  return (
    <div className={`stat-card stat-card-${tone}`}>
      <div className="stat-card-header">
        <span>{title}</span>
        {Icon && (
          <div className="stat-icon" aria-hidden="true">
            <Icon size={18} />
          </div>
        )}
      </div>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
