import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, ImageOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/apiClient';
import DataTable from '../../components/common/DataTable';
import SearchBar from '../../components/common/SearchBar';
import { getErrorMessage } from '../../utils/getErrorMessage';
import styles from './ProductsList.module.css';

const PAGE_SIZE = 10;

export default function ProductsList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [supplierOptions, setSupplierOptions] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 whenever any of the three filters actually changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter, supplierFilter]);

  // Populates both filter dropdowns with the FULL category/supplier lists,
  // not just what's on the current products page — ?all=true per the
  // documented convention for populating pickers. These are also reused to
  // resolve categoryId/supplierId -> display name in the table below, so
  // it's one fetch serving two purposes.
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const [categoriesRes, suppliersRes] = await Promise.all([
          api.get('/categories?all=true'),
          api.get('/suppliers?all=true'),
        ]);
        setCategoryOptions(Array.isArray(categoriesRes?.data) ? categoriesRes.data : []);
        setSupplierOptions(Array.isArray(suppliersRes?.data) ? suppliersRes.data : []);
      } catch (err) {
        console.error('Failed to load category/supplier filter options:', err);
      }
    }
    loadFilterOptions();
  }, []);

  const categoryNameById = useMemo(() => {
    const map = new Map();
    categoryOptions.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categoryOptions]);

  const supplierNameById = useMemo(() => {
    const map = new Map();
    supplierOptions.forEach((s) => map.set(s.id, s.companyName));
    return map;
  }, [supplierOptions]);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (categoryFilter) params.set('categoryId', categoryFilter);
      if (supplierFilter) params.set('supplierId', supplierFilter);

      const response = await api.get(`/products?${params.toString()}`);
      setProducts(response.data);
      setTotalPages(response.totalPages);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not load products.'));
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, categoryFilter, supplierFilter]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  async function handleDelete(product) {
    const confirmed = window.confirm(`Delete "${product.name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await api.delete(`/products/${product.id}`);
      toast.success('Product deleted.');
      loadProducts();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete this product.'));
    }
  }

  const isFiltering =
    debouncedSearch.trim().length > 0 || categoryFilter.length > 0 || supplierFilter.length > 0;

  const columns = [
    {
      key: 'image',
      header: 'Image',
      render: (row) =>
        row.image ? (
          <img src={row.image} alt="" className={styles.thumbnail} />
        ) : (
          <div className={styles.thumbnailPlaceholder}>
            <ImageOff size={16} strokeWidth={1.5} aria-hidden="true" />
          </div>
        ),
    },
    { key: 'name', header: 'Name' },
    { key: 'sku', header: 'SKU' },
    {
      key: 'categoryId',
      header: 'Category',
      render: (row) => categoryNameById.get(row.categoryId) ?? '—',
    },
    {
      key: 'supplierId',
      header: 'Supplier',
      render: (row) => supplierNameById.get(row.supplierId) ?? '—',
    },
    {
      key: 'unitPrice',
      header: 'Unit Price',
      // TypeORM often returns DECIMAL columns as strings — Number(...) guards
      // against that before formatting.
      render: (row) => Number(row.unitPrice ?? 0).toFixed(2),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Products</h1>
        <button
          type="button"
          className={styles.addButton}
          aria-label="Add Product"
          onClick={() => navigate('/products/new')}
        >
          <Plus size={20} strokeWidth={2} aria-hidden="true" />
          <span className={styles.addButtonLabel}>Add Product</span>
        </button>
      </div>

      <div className={styles.searchRow}>
        <div className={styles.searchBarWrap}>
          <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search by name or SKU…" />
        </div>
        <select
          className={styles.filterSelect}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          aria-label="Filter by supplier"
        >
          <option value="">All suppliers</option>
          {supplierOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.companyName}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={products}
        isLoading={isLoading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        titleKey="name"
        emptyMessage={isFiltering ? 'No products match your search or filters.' : 'No products yet.'}
        emptyActionLabel={isFiltering ? undefined : 'Add your first product'}
        onEmptyAction={isFiltering ? undefined : () => navigate('/products/new')}
        renderActions={(row) => (
          <div className={styles.actions}>
            <button
              type="button"
              aria-label={`Edit ${row.name}`}
              className={styles.iconButton}
              onClick={() => navigate(`/products/${row.id}/edit`)}
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
