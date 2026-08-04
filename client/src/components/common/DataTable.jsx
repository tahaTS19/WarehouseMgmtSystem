import styles from './DataTable.module.css';

/**
 * columns: [{ key, header, render?(row) }]
 * rows: array of objects, each needs an `id`
 * renderActions?(row): JSX for an actions cell (edit/delete buttons etc.)
 */
export default function DataTable({
  columns,
  rows,
  isLoading,
  emptyMessage,
  emptyActionLabel,
  onEmptyAction,
  renderActions,
}) {
  if (isLoading) {
    return <p className={styles.status}>Loading…</p>;
  }

  if (!rows || rows.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>{emptyMessage}</p>
        {onEmptyAction && emptyActionLabel && (
          <button type="button" className={styles.emptyActionButton} onClick={onEmptyAction}>
            {emptyActionLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
            {renderActions && <th className={styles.actionsHeader}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
              {renderActions && <td className={styles.actionsCell}>{renderActions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
