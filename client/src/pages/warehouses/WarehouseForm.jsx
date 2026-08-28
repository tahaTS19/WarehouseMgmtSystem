import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../services/apiClient';
import FormField from '../../components/common/FormField';
import { getErrorMessage } from '../../utils/getErrorMessage';
import styles from './WarehouseForm.module.css';

export default function WarehouseForm() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isEditMode) return;

    let isMounted = true;
    async function loadWarehouse() {
      try {
        const data = await api.get(`/warehouses/${id}`);
        if (isMounted) {
          setName(data.name ?? '');
          setLocation(data.location ?? '');
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'Could not load this warehouse.'));
        navigate('/warehouses');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadWarehouse();
    return () => {
      isMounted = false;
    };
  }, [id, isEditMode, navigate]);

  function validate() {
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = 'Warehouse name is required.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const payload = { name: name.trim(), location: location.trim() || undefined };

    try {
      if (isEditMode) {
        await api.patch(`/warehouses/${id}`, payload);
        toast.success('Warehouse updated.');
      } else {
        await api.post('/warehouses', payload);
        toast.success('Warehouse created.');
      }
      navigate('/warehouses');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save this warehouse.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <p className={styles.status}>Loading…</p>;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{isEditMode ? 'Edit Warehouse' : 'Add Warehouse'}</h1>
      <form className={styles.form} onSubmit={handleSubmit}>
        <FormField
          id="warehouse-name"
          name="name"
          label="Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          autoComplete="off"
        />
        <FormField
          id="warehouse-location"
          name="location"
          label="Location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          autoComplete="off"
        />

        <div className={styles.actionsRow}>
          <button type="button" className={styles.cancelButton} onClick={() => navigate('/warehouses')}>
            Cancel
          </button>
          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEditMode ? 'Save Changes' : 'Create Warehouse'}
          </button>
        </div>
      </form>
    </div>
  );
}
