import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/apiClient';
import DataTable from '../../components/common/DataTable';
import SearchBar from '../../components/common/SearchBar';
import { getErrorMessage } from '../../utils/getErrorMessage';
import styles from './SuppliersList.module.css';

const PAGE_SIZE = 10;

export default function SuppliersList() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // Fully independent from the search box now — never written to or read
  // from searchTerm/debouncedSearch, and vice versa.
  const [companyFilter, setCompanyFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [companyOptions, setCompanyOptions] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 whenever EITHER filter actually changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, companyFilter]);

  // Populates the company-name dropdown with every supplier, not just the
  // current page — ?all=true bypasses pagination per the documented
  // convention for populating pickers.
  useEffect(() => {
    async function loadCompanyOptions() {
      try {
        const response = await api.get('/suppliers?all=true');
        const list = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : [];
        const uniqueNames = Array.from(
          new Set(list.map((s) => s.companyName).filter(Boolean)),
        ).sort();
        setCompanyOptions(uniqueNames);
      } catch (err) {
        console.error('Failed to load supplier company options:', err);
      }
    }
    loadCompanyOptions();
  }, []);

  const loadSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      // NOTE: "companyName" as a dedicated filter param is NOT confirmed
      // against the real backend — no documented endpoint supports a
      // separate company-only filter alongside `search`. If the backend
      // doesn't recognize this param, it'll likely be silently ignored and
      // the dropdown won't actually narrow results. Verify against the
      // real Suppliers controller.
      if (companyFilter) params.set('companyName', companyFilter);

      const response = await api.get(`/suppliers?${params.toString()}`);
      setSuppliers(response.data);
      setTotalPages(response.totalPages);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load suppliers.'));
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, companyFilter]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  async function handleDelete(supplier) {
    const confirmed = window.confirm(`Delete "${supplier.companyName}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await api.delete(`/suppliers/${supplier.id}`);
      toast.success('Supplier deleted.');
      loadSuppliers();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete this supplier.'));
    }
  }

  const isFiltering = debouncedSearch.trim().length > 0 || companyFilter.length > 0;

  const columns = [
    { key: 'companyName', header: 'Company Name' },
    { key: 'contactPerson', header: 'Contact Person', render: (row) => row.contactPerson || '—' },
    { key: 'phone', header: 'Phone', render: (row) => row.phone || '—' },
    { key: 'email', header: 'Email', render: (row) => row.email || '—' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Suppliers</h1>
        <button
          type="button"
          className={styles.addButton}
          aria-label="Add Supplier"
          onClick={() => navigate('/suppliers/new')}
        >
          <Plus size={20} strokeWidth={2} aria-hidden="true" />
          <span className={styles.addButtonLabel}>Add Supplier</span>
        </button>
      </div>

      <div className={styles.searchRow}>
        <div className={styles.searchBarWrap}>
          {/* Whether "phone" actually gets matched depends on the backend's
              search implementation — unverified, flagged in loadSuppliers. */}
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by name or phone number…"
          />
        </div>
        <select
          className={styles.filterSelect}
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          aria-label="Filter by supplier firm name"
        >
          <option value="">All companies</option>
          {companyOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={suppliers}
        isLoading={isLoading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        titleKey="companyName"
        emptyMessage={isFiltering ? 'No suppliers match your search.' : 'No suppliers yet.'}
        emptyActionLabel={isFiltering ? undefined : 'Add your first supplier'}
        onEmptyAction={isFiltering ? undefined : () => navigate('/suppliers/new')}
        renderActions={(row) => (
          <div className={styles.actions}>
            <button
              type="button"
              aria-label={`Edit ${row.companyName}`}
              className={styles.iconButton}
              onClick={() => navigate(`/suppliers/${row.id}/edit`)}
            >
              <Pencil size={16} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Delete ${row.companyName}`}
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
