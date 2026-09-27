import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import { api } from '../../services/apiClient';
import { getErrorMessage } from '../../utils/getErrorMessage';
import styles from './ProductMovementReport.module.css';

/**
 * GET /reports/product-movement?from=&to= — confirmed shape: a flat array,
 * one row per (date, type) pair, no envelope:
 *   [{ date: ISOString, type: 'stock_in'|'stock_out', totalQuantity }, ...]
 *
 * Recharts needs ONE object per x-axis tick holding both series values to
 * draw grouped stock-in/stock-out bars side by side — passing the flat
 * array straight in (as a single-line chart) would zigzag between the two
 * types on one axis instead of comparing them. This pivots the flat array
 * into { date, stockIn, stockOut } rows, one per calendar day, before
 * charting — a deliberate step beyond "pass response directly in".
 */
function pivotByDate(rawRows) {
  const byDate = new Map();

  rawRows.forEach((row) => {
    const dateKey = row.date;
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, { date: dateKey, stockIn: 0, stockOut: 0 });
    }
    const entry = byDate.get(dateKey);
    if (row.type === 'stock_in') entry.stockIn += row.totalQuantity;
    else if (row.type === 'stock_out') entry.stockOut += row.totalQuantity;
  });

  return Array.from(byDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({
      ...entry,
      // Short display label for the x-axis — the grouping key above keeps
      // the full ISO string so same-day rows always merge correctly.
      label: new Date(entry.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
    }));
}

export default function ProductMovementReport() {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);
  const [points, setPoints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ from, to });
        const response = await api.get(`/reports/product-movement?${params.toString()}`);
        const rawRows = Array.isArray(response) ? response : [];
        if (isMounted) setPoints(pivotByDate(rawRows));
      } catch (err) {
        toast.error(getErrorMessage(err, 'Could not load the product movement report.'));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [from, to]);

  return (
    <div className={styles.section}>
      <div className={styles.dateRow}>
        <div className={styles.dateGroup}>
          <label className={styles.dateLabel} htmlFor="movement-from">
            From
          </label>
          <input
            id="movement-from"
            type="date"
            className={styles.dateInput}
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className={styles.dateGroup}>
          <label className={styles.dateLabel} htmlFor="movement-to">
            To
          </label>
          <input
            id="movement-to"
            type="date"
            className={styles.dateInput}
            value={to}
            min={from}
            max={today}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.chartCard}>
        {isLoading ? (
          <p className={styles.status}>Loading…</p>
        ) : points.length === 0 ? (
          <p className={styles.status}>No movement recorded in this date range.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" stroke="var(--color-ink-soft)" />
              <YAxis stroke="var(--color-ink-soft)" allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="stockIn" name="Stock In" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="stockOut" name="Stock Out" fill="var(--color-danger)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
