import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../services/apiClient';
import FormField from '../../components/common/FormField';
import { getErrorMessage } from '../../utils/getErrorMessage';
import styles from './SupplierForm.module.css';

export default function SupplierForm() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isEditMode) return;

    let isMounted = true;
    async function loadSupplier() {
      try {
        const data = await api.get(`/suppliers/${id}`);
        if (isMounted) {
          setCompanyName(data.companyName ?? '');
          setContactPerson(data.contactPerson ?? '');
          setPhone(data.phone ?? '');
          setEmail(data.email ?? '');
          setAddress(data.address ?? '');
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'Could not load this supplier.'));
        navigate('/suppliers');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadSupplier();
    return () => {
      isMounted = false;
    };
  }, [id, isEditMode, navigate]);

  function validate() {
    const nextErrors = {};
    if (!companyName.trim()) nextErrors.companyName = 'Company name is required.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const payload = {
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
    };

    try {
      if (isEditMode) {
        await api.patch(`/suppliers/${id}`, payload);
        toast.success('Supplier updated.');
      } else {
        await api.post('/suppliers', payload);
        toast.success('Supplier created.');
      }
      navigate('/suppliers');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save this supplier.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <p className={styles.status}>Loading…</p>;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{isEditMode ? 'Edit Supplier' : 'Add Supplier'}</h1>
      <form className={styles.form} onSubmit={handleSubmit}>
        <FormField
          id="supplier-company-name"
          name="companyName"
          label="Company Name"
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          error={errors.companyName}
          autoComplete="off"
        />
        <FormField
          id="supplier-contact-person"
          name="contactPerson"
          label="Contact Person"
          type="text"
          value={contactPerson}
          onChange={(e) => setContactPerson(e.target.value)}
          autoComplete="off"
        />
        <FormField
          id="supplier-phone"
          name="phone"
          label="Phone"
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="off"
        />
        <FormField
          id="supplier-email"
          name="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
        />
        <FormField
          id="supplier-address"
          name="address"
          label="Address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          autoComplete="off"
        />

        <div className={styles.actionsRow}>
          <button type="button" className={styles.cancelButton} onClick={() => navigate('/suppliers')}>
            Cancel
          </button>
          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEditMode ? 'Save Changes' : 'Create Supplier'}
          </button>
        </div>
      </form>
    </div>
  );
}
