import { useEffect, useState } from 'react';
import { DollarSign, Boxes, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/apiClient';
import StatCard from '../../components/common/StatCard';
import { getErrorMessage } from '../../utils/getErrorMessage';
import styles from './InventoryValueReport.module.css';

/**
 * GET /reports/inventory-value — confirmed shape, plain object, no envelope:
 *   {
 *     totals: { totalValuation, totalStockUnits, totalUniqueProducts },
 *     breakdownByWarehouse: [{ warehouseId, warehouseName, valuation, totalUnits }]
 *   }
 */
export default function InventoryValueReport() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const response = await api.get('/reports/inventory-value');
        if (isMounted) setData(response);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Could not load the inventory value report.'));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <p className={styles.status}>Loading…</p>;
  }

  const totals = data?.totals ?? {};
  const breakdown = Array.isArray(data?.breakdownByWarehouse) ? data.breakdownByWarehouse : [];

  return (
    <div className={styles.section}>
      <div className={styles.statGrid}>
        <StatCard
          icon={DollarSign}
          label="Total Valuation"
          value={Number(totals.totalValuation ?? 0).toFixed(2)}
        />
        <StatCard icon={Boxes} label="Total Stock Units" value={totals.totalStockUnits ?? 0} />
        <StatCard icon={Package} label="Unique Products" value={totals.totalUniqueProducts ?? 0} />
      </div>

      {breakdown.length > 0 && (
        <div className={styles.breakdownCard}>
          <h2 className={styles.breakdownTitle}>By Warehouse</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Warehouse</th>
                <th className={styles.numericHeader}>Valuation</th>
                <th className={styles.numericHeader}>Units</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row) => (
                <tr key={row.warehouseId}>
                  <td>{row.warehouseName}</td>
                  <td className={styles.valueCell}>{Number(row.valuation ?? 0).toFixed(2)}</td>
                  <td className={styles.valueCell}>{row.totalUnits ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
