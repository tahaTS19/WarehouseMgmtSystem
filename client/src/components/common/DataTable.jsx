import { useIsMobile } from "./useIsMobile";
import styles from "./DataTable.module.css";
 
/**
 * columns: [{ key, header, render?(row) }]
 * rows: array of objects, each needs an `id`
 * renderActions?(row): JSX for row actions (edit/delete buttons etc.)
 * titleKey?: which column's value becomes the card's title on mobile —
 *   defaults to the first column.
 * subtitleKey?: OPTIONAL — a column whose value renders as a plain,
 *   left-aligned line directly under the title (no label, not part of the
 *   label:value detail rows). Use this for free-text fields like a
 *   description, where "Description: <right-aligned text>" reads oddly.
 *   Everything else (not titleKey or subtitleKey) renders as a normal
 *   label:value detail row.
 */
export default function DataTable({
  columns,
  rows,
  isLoading,
  emptyMessage,
  emptyActionLabel,
  onEmptyAction,
  renderActions,
  titleKey,
  subtitleKey,
  page,
  totalPages,
  onPageChange,
}) {
  const isMobile = useIsMobile();
 
  if (isLoading) {
    return <p className={styles.status}>Loading…</p>;
  }
 
  if (!rows || rows.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>{emptyMessage}</p>
 
        {onEmptyAction && emptyActionLabel && (
          <button
            type="button"
            className={styles.emptyActionButton}
            onClick={onEmptyAction}
          >
            {emptyActionLabel}
          </button>
        )}
      </div>
    );
  }
 
  const pagination =
    totalPages > 1 ? (
      <div className={styles.pagination}>
        <button
          type="button"
          className={styles.pageButton}
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
 
        <span className={styles.pageInfo}>
          Page {page} of {totalPages}
        </span>
 
        <button
          type="button"
          className={styles.pageButton}
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    ) : null;
 
  if (isMobile) {
    const effectiveTitleKey = titleKey ?? columns[0]?.key;
    const titleColumn = columns.find((col) => col.key === effectiveTitleKey);
    const subtitleColumn = subtitleKey
      ? columns.find((col) => col.key === subtitleKey)
      : null;
    const detailColumns = columns.filter(
      (col) => col.key !== effectiveTitleKey && col.key !== subtitleKey,
    );
 
    return (
      <>
        <ul className={styles.cardList}>
          {rows.map((row) => (
            <li key={row.id} className={styles.card}>
              <div className={styles.cardTitle}>
                {titleColumn?.render
                  ? titleColumn.render(row)
                  : row[effectiveTitleKey]}
              </div>
 
              {subtitleColumn && (
                <p className={styles.cardSubtitle}>
                  {subtitleColumn.render
                    ? subtitleColumn.render(row)
                    : row[subtitleColumn.key]}
                </p>
              )}
 
              {detailColumns.length > 0 && (
                <div className={styles.cardDetails}>
                  {detailColumns.map((col) => (
                    <div key={col.key} className={styles.cardRow}>
                      <span className={styles.cardLabel}>{col.header}</span>
 
                      <span className={styles.cardValue}>
                        {col.render ? col.render(row) : row[col.key]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
 
              {renderActions && (
                <div className={styles.cardActions}>{renderActions(row)}</div>
              )}
            </li>
          ))}
        </ul>
 
        {pagination}
      </>
    );
  }
 
  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
 
              {renderActions && (
                <th className={styles.actionsHeader}>Actions</th>
              )}
            </tr>
          </thead>
 
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
 
                {renderActions && (
                  <td className={styles.actionsCell}>{renderActions(row)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
 
      {pagination}
    </>
  );
}