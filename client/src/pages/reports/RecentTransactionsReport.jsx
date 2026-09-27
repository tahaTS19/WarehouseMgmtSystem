import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/apiClient';
import DataTable from '../../components/common/DataTable';
import { getErrorMessage } from '../../utils/getErrorMessage';
import styles from './RecentTransactionsReport.module.css';

const RECENT_LIMIT = 10;

const TYPE_LABELS = { stock_in: 'Stock In', stock_out: 'Stock Out' };

/**
 * Reuses the CONFIRMED /transactions endpoint (same contract already
 * verified in the Transactions module) rather than a new, unconfirmed
 * /reports/recent-transactions route — admins already see company-wide
 * transactions through this endpoint, so nothing new is needed here.
 */
export default function RecentTransactionsReport() {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const response = await api.get(`/transactions?page=1&limit=${RECENT_LIMIT}`);
        if (isMounted) setTransactions(response.data);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Could not load recent transactions.'));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const columns = [
    {
      key: 'product',
      header: 'Product',
      render: (row) =>
        row.warehouseInventory?.product
          ? `${row.warehouseInventory.product.name} (${row.warehouseInventory.product.sku})`
          : '—',
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      render: (row) => row.warehouseInventory?.warehouse?.name ?? '—',
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span
          className={
            row.type === 'stock_in'
              ? `${styles.typeBadge} ${styles.typeIn}`
              : `${styles.typeBadge} ${styles.typeOut}`
          }
        >
          {row.type === 'stock_in' ? (
            <ArrowDownToLine size={14} strokeWidth={2} aria-hidden="true" />
          ) : (
            <ArrowUpFromLine size={14} strokeWidth={2} aria-hidden="true" />
          )}
          {TYPE_LABELS[row.type] ?? row.type}
        </span>
      ),
    },
    { key: 'quantity', header: 'Quantity' },
    {
      key: 'createdAt',
      header: 'Date',
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
  ];

  return (
    <div className={styles.section}>
      <DataTable
        columns={columns}
        rows={transactions}
        isLoading={isLoading}
        titleKey="product"
        emptyMessage="No transactions yet."
      />
      <Link to="/transactions" className={styles.viewAllLink}>
        View all transactions →
      </Link>
    </div>
  );
}
