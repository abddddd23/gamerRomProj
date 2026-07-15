import { ReactNode } from "react";

interface DataTableProps {
  children: ReactNode;
  empty?: boolean;
  emptyState?: ReactNode;
}

export function DataTable({ children, empty = false, emptyState }: DataTableProps) {
  return (
    <div className="table-card">
      {empty && emptyState ? emptyState : <div className="table-scroll">{children}</div>}
    </div>
  );
}
