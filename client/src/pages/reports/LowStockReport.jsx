import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/apiClient';
import DataTable from '../../components/common/DataTable';
import { getErrorMessage } from '../../utils/getErrorMessage';
import styles from './LowStockReport.module.css';

/**
 * ENDPOINT UNCONFIRMED: GET /reports/low-stock
 * Assumed to return WarehouseInventory rows (real entities, per the doc's
 * "use .getMany()" guidance) with nested product/warehouse, similar in
 * shape to WarehouseInventory rows seen elsewhere in this app:
 *   { id, currentStock, minimumStock, product: { name, sku }, warehouse: { name } }
 * Response envelope also unconfirmed — handled defensively below for
 * either a raw array or the standard { data: [...] } wrapper.
 */
export default function LowStockReport() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const response = await api.get('/reports/low-stock');
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];
        if (isMounted) setRows(list);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Could not load the low stock report.'));
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
      render: (row) => (row.product ? `${row.product.name} (${row.product.sku})` : '—'),
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      render: (row) => row.warehouse?.name ?? '—',
    },
    {
      key: 'currentStock',
      header: 'Current Stock',
      render: (row) => (
        <span className={styles.lowValue}>
          <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
          {row.currentStock}
        </span>
      ),
    },
    { key: 'minimumStock', header: 'Minimum Stock' },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      isLoading={isLoading}
      titleKey="product"
      emptyMessage="Nothing is below its minimum stock level right now."
    />
  );
}
