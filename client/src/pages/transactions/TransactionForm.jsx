import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/apiClient';
import FormField from '../../components/common/FormField';
import { getErrorMessage } from '../../utils/getErrorMessage';
import styles from './TransactionForm.module.css';

const REASON_OPTIONS = [
  { value: 'purchase', label: 'Purchase' },
  { value: 'sale', label: 'Sale' },
  { value: 'damage', label: 'Damage' },
  { value: 'return', label: 'Return' },
  { value: 'manual_adjustment', label: 'Manual Adjustment' },
];

export default function TransactionForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [inventoryRows, setInventoryRows] = useState([]);
  const [warehouseInventoryId, setWarehouseInventoryId] = useState('');
  const [type, setType] = useState('stock_in');
  const [reason, setReason] = useState('purchase');
  const [quantity, setQuantity] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial load differs by role:
  // - Admin: fetch the warehouse list to populate the Warehouse picker.
  //   GET /warehouses is documented as ADMIN-ONLY — calling it as Staff
  //   would 403, so Staff must never hit this branch.
  // - Staff: skip the warehouse step entirely. GET /warehouse-inventory
  //   with no warehouseId auto-scopes to their assigned warehouse
  //   server-side, so their Product list is already exactly right.
  useEffect(() => {
    async function loadInitialData() {
      try {
        if (isAdmin) {
          const response = await api.get('/warehouses?all=true');
          setWarehouses(Array.isArray(response?.data) ? response.data : []);
        } else {
          const response = await api.get('/warehouse-inventory?all=true');
          setInventoryRows(Array.isArray(response?.data) ? response.data : []);
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'Could not load data.'));
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [isAdmin]);

  // Admin only: re-fetch inventory whenever the chosen warehouse changes.
  // Staff already got their (auto-scoped) inventory in the effect above and
  // never has a warehouseId to react to here.
  useEffect(() => {
    if (!isAdmin) return;

    if (!warehouseId) {
      setInventoryRows([]);
      setWarehouseInventoryId('');
      return;
    }

    let isMounted = true;
    async function loadInventory() {
      setIsLoadingInventory(true);
      try {
        const response = await api.get(`/warehouse-inventory?warehouseId=${warehouseId}&all=true`);
        if (isMounted) setInventoryRows(Array.isArray(response?.data) ? response.data : []);
      } catch (err) {
        if (isMounted) {
          toast.error(getErrorMessage(err, 'Could not load products for this warehouse.'));
          setInventoryRows([]);
        }
      } finally {
        if (isMounted) setIsLoadingInventory(false);
      }
    }
    loadInventory();
    return () => {
      isMounted = false;
    };
  }, [warehouseId, isAdmin]);

  const selectedInventoryRow = inventoryRows.find((row) => row.id === warehouseInventoryId);
  const isProductSelectDisabled = (isAdmin && !warehouseId) || isLoadingInventory;

  function productPlaceholder() {
    if (isAdmin && !warehouseId) return 'Select a warehouse first…';
    if (isLoadingInventory) return 'Loading…';
    return 'Select a product…';
  }

  function validate() {
    const nextErrors = {};
    if (isAdmin && !warehouseId) nextErrors.warehouseId = 'Please select a warehouse.';
    if (!warehouseInventoryId) nextErrors.warehouseInventoryId = 'Please select a product.';

    const qty = Number(quantity);
    if (!quantity.trim() || Number.isNaN(qty) || !Number.isInteger(qty) || qty < 1) {
      nextErrors.quantity = 'Quantity must be a whole number of at least 1.';
    } else if (type === 'stock_out' && selectedInventoryRow && qty > selectedInventoryRow.currentStock) {
      // Client-side pre-check per the doc — the backend still enforces this
      // for real (pessimistic lock + atomic check), this is just early UX.
      nextErrors.quantity = `Only ${selectedInventoryRow.currentStock} in stock — cannot stock out ${qty}.`;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await api.post('/transactions', {
        warehouseInventoryId,
        quantity: Number(quantity),
        type,
        reason,
      });
      toast.success(type === 'stock_in' ? 'Stock in recorded.' : 'Stock out recorded.');
      navigate('/transactions');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not record this stock movement.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <p className={styles.status}>Loading…</p>;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Record Stock Movement</h1>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.typeToggle} role="radiogroup" aria-label="Movement type">
          <button
            type="button"
            role="radio"
            aria-checked={type === 'stock_in'}
            className={
              type === 'stock_in' ? `${styles.typeButton} ${styles.typeButtonActive}` : styles.typeButton
            }
            onClick={() => setType('stock_in')}
          >
            Stock In
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={type === 'stock_out'}
            className={
              type === 'stock_out' ? `${styles.typeButton} ${styles.typeButtonActive}` : styles.typeButton
            }
            onClick={() => setType('stock_out')}
          >
            Stock Out
          </button>
        </div>

        {/* Admin only — Staff never sees a warehouse picker at all, since
            they only have one warehouse and the backend already scopes
            their inventory to it automatically. */}
        {isAdmin && (
          <div className={styles.selectGroup}>
            <label className={styles.selectLabel} htmlFor="txn-warehouse">
              Warehouse
            </label>
            <select
              id="txn-warehouse"
              className={styles.select}
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value);
                setWarehouseInventoryId('');
              }}
            >
              <option value="">Select a warehouse…</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            {errors.warehouseId && <p className={styles.fieldError}>{errors.warehouseId}</p>}
          </div>
        )}

        <div className={styles.selectGroup}>
          <label className={styles.selectLabel} htmlFor="txn-product">
            Product
          </label>
          <select
            id="txn-product"
            className={styles.select}
            value={warehouseInventoryId}
            onChange={(e) => setWarehouseInventoryId(e.target.value)}
            disabled={isProductSelectDisabled}
          >
            <option value="">{productPlaceholder()}</option>
            {inventoryRows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.product?.name} ({row.product?.sku}) — {row.currentStock} in stock
              </option>
            ))}
          </select>
          {errors.warehouseInventoryId && (
            <p className={styles.fieldError}>{errors.warehouseInventoryId}</p>
          )}
        </div>

        <div className={styles.selectGroup}>
          <label className={styles.selectLabel} htmlFor="txn-reason">
            Reason
          </label>
          <select
            id="txn-reason"
            className={styles.select}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {REASON_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <FormField
          id="txn-quantity"
          name="quantity"
          label="Quantity"
          type="text"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          error={errors.quantity}
          autoComplete="off"
        />

        {selectedInventoryRow && (
          <p className={styles.stockHint}>Current stock: {selectedInventoryRow.currentStock}</p>
        )}

        <div className={styles.actionsRow}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => navigate('/transactions')}
          >
            Cancel
          </button>
          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Recording…' : 'Record Movement'}
          </button>
        </div>
      </form>
    </div>
  );
}
