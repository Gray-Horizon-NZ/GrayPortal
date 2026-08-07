export type TableColumn<T> = {
  key: string;
  header: string;
  align?: "left" | "right";
  numeric?: boolean;
  render: (row: T) => React.ReactNode;
};

/**
 * Real <table>-based list rendering with mono-aligned numeric columns.
 * Reflows to stacked label/value rows under 640px via a container query
 * in globals.css (.gh-table-wrap / .gh-table) — no JS breakpoint needed.
 */
export default function Table<T>({
  columns,
  rows,
  rowKey,
  emptyState,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyState?: React.ReactNode;
}) {
  if (rows.length === 0 && emptyState) {
    return <div className="gh-card">{emptyState}</div>;
  }

  return (
    <div className="gh-table-wrap">
      <table className="gh-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ textAlign: col.align ?? (col.numeric ? "right" : "left") }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  data-label={col.header}
                  className={col.numeric ? "gh-table-num" : undefined}
                  style={{ textAlign: col.align }}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
