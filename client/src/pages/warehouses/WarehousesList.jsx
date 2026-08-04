import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/apiClient';
import DataTable from '../../components/common/DataTable';
import { getErrorMessage } from '../../utils/getErrorMessage';
import styles from './WarehousesList.module.css';

export default function WarehousesList() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadWarehouses = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get('/warehouses');
      setWarehouses(data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load warehouses.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  async function handleDelete(warehouse) {
    const confirmed = window.confirm(`Delete "${warehouse.name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await api.delete(`/warehouses/${warehouse.id}`);
      toast.success('Warehouse deleted.');
      setWarehouses((current) => current.filter((w) => w.id !== warehouse.id));
    } catch (err) {
      // Backend returns 409 specifically when the warehouse has transaction
      // history — getErrorMessage surfaces that real message rather than a
      // generic one, since it's meaningfully different from other failures.
      toast.error(getErrorMessage(err, 'Could not delete this warehouse.'));
    }
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'location', header: 'Location', render: (row) => row.location || '—' },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Warehouses</h1>
        <button type="button" className={styles.addButton} onClick={() => navigate('/warehouses/new')}>
          <Plus size={18} strokeWidth={2} aria-hidden="true" />
          Add Warehouse
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={warehouses}
        isLoading={isLoading}
        emptyMessage="No warehouses yet."
        emptyActionLabel="Add your first warehouse"
        onEmptyAction={() => navigate('/warehouses/new')}
        renderActions={(row) => (
          <div className={styles.actions}>
            <button
              type="button"
              aria-label={`Edit ${row.name}`}
              className={styles.iconButton}
              onClick={() => navigate(`/warehouses/${row.id}/edit`)}
            >
              <Pencil size={16} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Delete ${row.name}`}
              className={`${styles.iconButton} ${styles.danger}`}
              onClick={() => handleDelete(row)}
            >
              <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        )}
      />
    </div>
  );
}
