import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

/** Used by the dispatcher queue, delivery history, and admin tables.
 * Subtle row separation rather than heavy borders (docs/design-system.md
 * §6 "Tables" — avoid excessive borders, use surface separation). */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = "No records to show.",
  onRowClick,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <EmptyState title={emptyMessage} />;
  }

  return (
    <table className="w-full border-collapse text-left text-body">
      <thead>
        <tr className="border-b border-border text-caption uppercase tracking-wide text-muted">
          {columns.map((col) => (
            <th key={col.key} className={`px-4 py-2.5 font-medium ${col.className ?? ""}`}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={getRowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`border-b border-border/70 transition-colors duration-150 last:border-0 ${
              onRowClick ? "cursor-pointer hover:bg-graphite-50" : ""
            }`}
          >
            {columns.map((col) => (
              <td key={col.key} className={`px-4 py-3 text-foreground ${col.className ?? ""}`}>
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
