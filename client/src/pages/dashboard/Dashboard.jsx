import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Package, Warehouse, Tag, Truck, AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/apiClient';
import StatCard from '../../components/common/StatCard';
import styles from './Dashboard.module.css';

const CHART_COLORS = ['#2B4C7E', '#D98E2B', '#3F7D58', '#B3452C', '#5B6472'];

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      try {
        const data = await api.get('/dashboard/summary');
        if (isMounted) setSummary(data);
      } catch (err) {
        if (isMounted) setError('Could not load dashboard data. Try refreshing the page.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSummary();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <p className={styles.status}>Loading dashboard…</p>;
  }

  if (error) {
    return <p className={styles.statusError}>{error}</p>;
  }

  const isAdmin = user?.role === 'admin';
  const recentRows = isAdmin ? summary.recentTransactions : summary.recentActivity;

  return (
    <div className={styles.dashboard}>
      <h1 className={styles.title}>Dashboard</h1>

      <div className={styles.statGrid}>
        {isAdmin ? (
          <>
            <StatCard icon={Warehouse} label="Warehouses" value={summary.totalWarehouses} />
            <StatCard icon={Package} label="Products" value={summary.totalProducts} />
            <StatCard icon={Tag} label="Categories" value={summary.totalCategories} />
            <StatCard icon={Truck} label="Suppliers" value={summary.totalSuppliers} />
            <StatCard icon={AlertTriangle} label="Low Stock" value={summary.lowStockCount} accent />
            <StatCard icon={ArrowLeftRight} label="Transactions Today" value={summary.transactionsToday} />
          </>
        ) : (
          <>
            <StatCard icon={Package} label="Products" value={summary.totalProducts} />
            <StatCard icon={ArrowLeftRight} label="Transactions Today" value={summary.transactionsToday} />
          </>
        )}
      </div>

      {isAdmin && (
        <div className={styles.chartsRow}>
          <div className={styles.chartCard}>
            <h2 className={styles.chartTitle}>Stock In vs Out</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={[
                  { name: 'Stock In', value: summary.stockInVsOut?.stockIn ?? 0 },
                  { name: 'Stock Out', value: summary.stockInVsOut?.stockOut ?? 0 },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-ink-soft)" />
                <YAxis stroke="var(--color-ink-soft)" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.chartCard}>
            <h2 className={styles.chartTitle}>Products by Category</h2>
            {summary.productsByCategory?.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={summary.productsByCategory}
                    dataKey="count"
                    nameKey="category"
                    outerRadius={90}
                    label
                  >
                    {summary.productsByCategory.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className={styles.emptyState}>No category data yet.</p>
            )}
          </div>
        </div>
      )}

      <div className={styles.recentSection}>
        <h2 className={styles.chartTitle}>{isAdmin ? 'Recent Transactions' : 'Recent Activity'}</h2>
        <div className={styles.tableWrap}>
          <RecentTable rows={recentRows} />
        </div>
      </div>
    </div>
  );
}

/**
 * NOTE: admin's recentTransactions shape is marked "TBD by what getRawMany
 * returns" on the backend. This renders defensively against common field
 * names (type, reason, quantity, createdAt) and falls back to em-dashes
 * for anything missing — revisit once the real shape is confirmed.
 */
function RecentTable({ rows }) {
  if (!rows || rows.length === 0) {
    return <p className={styles.emptyState}>No recent activity yet.</p>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Type</th>
          <th>Reason</th>
          <th>Quantity</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.id ?? index}>
            <td>{row.type ?? '—'}</td>
            <td>{row.reason ?? '—'}</td>
            <td>{row.quantity ?? '—'}</td>
            <td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
