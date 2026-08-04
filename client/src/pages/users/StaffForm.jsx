import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../services/apiClient';
import FormField from '../../components/common/FormField';
import { getErrorMessage } from '../../utils/getErrorMessage';
import styles from './StaffForm.module.css';

export default function StaffForm() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [warehousesData, userData] = await Promise.all([
          api.get('/warehouses'),
          isEditMode ? api.get(`/users/${id}`) : Promise.resolve(null),
        ]);
        if (!isMounted) return;

        setWarehouses(warehousesData);
        if (userData) {
          setName(userData.name ?? '');
          setEmail(userData.email ?? '');
          setPhone(userData.phone ?? '');
          setWarehouseId(userData.warehouseId ?? '');
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'Could not load this page.'));
        navigate('/employees');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [id, isEditMode, navigate]);

  function validate() {
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = 'Name is required.';
    if (!email.trim()) nextErrors.email = 'Email is required.';
    if (!isEditMode && password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }
    if (!warehouseId) nextErrors.warehouseId = 'Please select a warehouse.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await api.patch(`/users/${id}`, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          warehouseId,
        });
        toast.success('Staff account updated.');
      } else {
        await api.post('/users', {
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
          warehouseId,
        });
        toast.success('Staff account created.');
      }
      navigate('/employees');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save this staff account.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <p className={styles.status}>Loading…</p>;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{isEditMode ? 'Edit Staff Member' : 'Add Staff'}</h1>
      <form className={styles.form} onSubmit={handleSubmit}>
        <FormField
          id="staff-name"
          name="name"
          label="Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          autoComplete="off"
        />
        <FormField
          id="staff-email"
          name="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          autoComplete="off"
        />
        {/* Edit mode never shows Password — backend doesn't accept it on
            update at all, per the API contract. */}
        {!isEditMode && (
          <FormField
            id="staff-password"
            name="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            autoComplete="new-password"
          />
        )}
        <FormField
          id="staff-phone"
          name="phone"
          label="Phone"
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="off"
        />

        <label className={styles.selectLabel} htmlFor="staff-warehouse">
          Warehouse
        </label>
        <select
          id="staff-warehouse"
          name="warehouseId"
          className={styles.select}
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
        >
          <option value="">Select a warehouse…</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        {errors.warehouseId && <p className={styles.fieldError}>{errors.warehouseId}</p>}

        <div className={styles.actionsRow}>
          <button type="button" className={styles.cancelButton} onClick={() => navigate('/employees')}>
            Cancel
          </button>
          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEditMode ? 'Save Changes' : 'Create Staff Account'}
          </button>
        </div>
      </form>
    </div>
  );
}
