import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/apiClient';
import DataTable from '../../components/common/DataTable';
import SearchBar from '../../components/common/SearchBar';
import { getErrorMessage } from '../../utils/getErrorMessage';
import styles from './TransactionsList.module.css';

const PAGE_SIZE = 10;

const TYPE_LABELS = { stock_in: 'Stock In', stock_out: 'Stock Out' };
const REASON_LABELS = {
  purchase: 'Purchase',
  sale: 'Sale',
  damage: 'Damage',
  return: 'Return',
  manual_adjustment: 'Manual Adjustment',
};

export default function TransactionsList() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter, reasonFilter]);

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (typeFilter) params.set('type', typeFilter);
      if (reasonFilter) params.set('reason', reasonFilter);

      const response = await api.get(`/transactions?${params.toString()}`);
      setTransactions(response.data);
      setTotalPages(response.totalPages);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load transactions.'));
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, typeFilter, reasonFilter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const isFiltering =
    debouncedSearch.trim().length > 0 || typeFilter.length > 0 || reasonFilter.length > 0;

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
    { key: 'reason', header: 'Reason', render: (row) => REASON_LABELS[row.reason] ?? row.reason },
    { key: 'quantity', header: 'Quantity' },
    {
      key: 'createdAt',
      header: 'Date',
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      key: 'user',
      header: 'Performed By',
      // NOTE: the Transactions doc's sample payload showed user.firstName/
      // lastName, but the actual User entity (confirmed everywhere else in
      // this app — Staff module, JWT payload) only has a single "name"
      // field. Using that instead, matching what the schema actually is.
      render: (row) => row.user?.name ?? '—',
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Transactions</h1>
        <button
          type="button"
          className={styles.addButton}
          aria-label="Record Stock Movement"
          onClick={() => navigate('/transactions/new')}
        >
          <Plus size={20} strokeWidth={2} aria-hidden="true" />
          <span className={styles.addButtonLabel}>Record Stock Movement</span>
        </button>
      </div>

      <div className={styles.searchRow}>
        <div className={styles.searchBarWrap}>
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by product name or SKU…"
          />
        </div>
        <select
          className={styles.filterSelect}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          <option value="stock_in">Stock In</option>
          <option value="stock_out">Stock Out</option>
        </select>
        <select
          className={styles.filterSelect}
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
          aria-label="Filter by reason"
        >
          <option value="">All reasons</option>
          <option value="purchase">Purchase</option>
          <option value="sale">Sale</option>
          <option value="damage">Damage</option>
          <option value="return">Return</option>
          <option value="manual_adjustment">Manual Adjustment</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={transactions}
        isLoading={isLoading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        titleKey="product"
        emptyMessage={isFiltering ? 'No transactions match your filters.' : 'No transactions yet.'}
        emptyActionLabel={isFiltering ? undefined : 'Record your first stock movement'}
        onEmptyAction={isFiltering ? undefined : () => navigate('/transactions/new')}
        // Deliberately no renderActions — this is an immutable audit log,
        // no edit/delete endpoints exist for transactions at all.
      />
    </div>
  );
}
