import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../services/apiClient';
import FormField from '../../components/common/FormField';
import { getErrorMessage } from '../../utils/getErrorMessage';
import styles from './CategoryForm.module.css';

export default function CategoryForm() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isEditMode) return;

    let isMounted = true;
    async function loadCategory() {
      try {
        const data = await api.get(`/categories/${id}`);
        if (isMounted) {
          setName(data.name ?? '');
          setDescription(data.description ?? '');
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'Could not load this category.'));
        navigate('/categories');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadCategory();
    return () => {
      isMounted = false;
    };
  }, [id, isEditMode, navigate]);

  function validate() {
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = 'Category name is required.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const payload = { name: name.trim(), description: description.trim() || undefined };

    try {
      if (isEditMode) {
        await api.patch(`/categories/${id}`, payload);
        toast.success('Category updated.');
      } else {
        await api.post('/categories', payload);
        toast.success('Category created.');
      }
      navigate('/categories');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save this category.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <p className={styles.status}>Loading…</p>;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{isEditMode ? 'Edit Category' : 'Add Category'}</h1>
      <form className={styles.form} onSubmit={handleSubmit}>
        <FormField
          id="category-name"
          name="name"
          label="Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          autoComplete="off"
        />

        {/* FormField doesn't support a textarea type, so this field is
            built manually — same pattern as the warehouse <select> in
            StaffForm. NOTE: 500 is a UI-only soft cap, not a confirmed
            backend limit — adjust if the real column has a different max. */}
        <div className={styles.textareaGroup}>
          <label className={styles.textareaLabel} htmlFor="category-description">
            Description
          </label>
          <textarea
            id="category-description"
            name="description"
            className={styles.textarea}
            rows={4}
            maxLength={500}
            placeholder="Optional — briefly describe this category"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <span className={styles.charCount}>{description.length}/500</span>
        </div>

        <div className={styles.actionsRow}>
          <button type="button" className={styles.cancelButton} onClick={() => navigate('/categories')}>
            Cancel
          </button>
          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEditMode ? 'Save Changes' : 'Create Category'}
          </button>
        </div>
      </form>
    </div>
  );
}
