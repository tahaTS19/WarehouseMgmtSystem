import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/apiClient';
import DataTable from '../../components/common/DataTable';
import SearchBar from '../../components/common/SearchBar';
import { getErrorMessage } from '../../utils/getErrorMessage';
import styles from './CategoriesList.module.css';

const PAGE_SIZE = 10;

export default function CategoriesList() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // SearchBar itself has no built-in debounce — it's a plain controlled
  // input — so this debounce lives here, same as WarehousesList/StaffList.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Once the debounced value actually changes, jump back to page 1 — a
  // stale page number from before the search could land past the end of
  // the new, smaller result set.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());

      const response = await api.get(`/categories?${params.toString()}`);
      setCategories(response.data);
      setTotalPages(response.totalPages);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load categories.'));
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  async function handleDelete(category) {
    const confirmed = window.confirm(`Delete "${category.name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await api.delete(`/categories/${category.id}`);
      toast.success('Category deleted.');
      // Re-fetch rather than splicing local state — pagination is
      // server-driven, so item count and totalPages need to come from the
      // server after a delete, not be guessed locally.
      loadCategories();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete this category.'));
    }
  }

  const isFiltering = debouncedSearch.trim().length > 0;

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'description', header: 'Description', render: (row) => row.description || '—' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Categories</h1>
        <button
          type="button"
          className={styles.addButton}
          aria-label="Add Category"
          onClick={() => navigate('/categories/new')}
        >
          <Plus size={20} strokeWidth={2} aria-hidden="true" />
          <span className={styles.addButtonLabel}>Add Category</span>
        </button>
      </div>

      <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search categories…" />

      <DataTable
        columns={columns}
        rows={categories}
        isLoading={isLoading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        titleKey="name"
        subtitleKey="description"
        emptyMessage={isFiltering ? 'No categories match your search.' : 'No categories yet.'}
        emptyActionLabel={isFiltering ? undefined : 'Add your first category'}
        onEmptyAction={isFiltering ? undefined : () => navigate('/categories/new')}
        renderActions={(row) => (
          <div className={styles.actions}>
            <button
              type="button"
              aria-label={`Edit ${row.name}`}
              className={styles.iconButton}
              onClick={() => navigate(`/categories/${row.id}/edit`)}
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
