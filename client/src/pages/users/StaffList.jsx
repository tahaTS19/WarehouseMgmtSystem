import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/apiClient';
import DataTable from '../../components/common/DataTable';
import { getErrorMessage } from '../../utils/getErrorMessage';
import styles from './StaffList.module.css';

export default function StaffList() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersData, warehousesData] = await Promise.all([
        api.get('/users'),
        api.get('/warehouses'),
      ]);
      // Backend may include the admin themself in this list — this screen
      // should only ever show actual staff accounts.
      setStaff(usersData.filter((u) => u.role === 'staff'));
      setWarehouses(warehousesData);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load staff.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const warehouseNameById = useMemo(() => {
    const map = new Map();
    warehouses.forEach((w) => map.set(w.id, w.name));
    return map;
  }, [warehouses]);

  async function handleDelete(person) {
    const confirmed = window.confirm(`Delete "${person.name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await api.delete(`/users/${person.id}`);
      toast.success('Staff account deleted.');
      setStaff((current) => current.filter((s) => s.id !== person.id));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete this staff account.'));
    }
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    {
      key: 'warehouseId',
      header: 'Warehouse',
      render: (row) => warehouseNameById.get(row.warehouseId) ?? '—',
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Staff</h1>
        <button
          type="button"
          className={styles.addButton}
          aria-label="Add Staff"
          onClick={() => navigate('/employees/new')}
        >
          <Plus size={20} strokeWidth={2} aria-hidden="true" />
          <span className={styles.addButtonLabel}>Add Staff</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={staff}
        isLoading={isLoading}
        emptyMessage="No staff accounts yet."
        emptyActionLabel="Add your first staff member"
        onEmptyAction={() => navigate('/employees/new')}
        renderActions={(row) => (
          <div className={styles.actions}>
            <button
              type="button"
              aria-label={`Edit ${row.name}`}
              className={styles.iconButton}
              onClick={() => navigate(`/employees/${row.id}/edit`)}
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
