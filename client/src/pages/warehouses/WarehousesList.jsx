import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import SearchBar from "../../components/common/SearchBar";
import toast from "react-hot-toast";
import { api } from "../../services/apiClient";
import DataTable from "../../components/common/DataTable";
import { getErrorMessage } from "../../utils/getErrorMessage";
import styles from "./WarehousesList.module.css";

export default function WarehousesList() {
  const navigate = useNavigate();

  const [warehouses, setWarehouses] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const loadWarehouses = useCallback(async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams();

      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }

      params.append("page", page.toString());
      params.append("limit", "10"); //limit

      const data = await api.get(`/warehouses?${params.toString()}`);

      setWarehouses(data.data);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not load warehouses."));
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  async function handleDelete(warehouse) {
    const confirmed = window.confirm(
      `Delete "${warehouse.name}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      await api.delete(`/warehouses/${warehouse.id}`);

      toast.success("Warehouse deleted.");

      setWarehouses((current) => current.filter((w) => w.id !== warehouse.id));
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete this warehouse."));
    }
  }

  const columns = [
    { key: "name", header: "Name" },
    {
      key: "location",
      header: "Location",
      render: (row) => row.location || "—",
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Warehouses</h1>

        <button
          type="button"
          className={styles.addButton}
          aria-label="Add Warehouse"
          onClick={() => navigate("/warehouses/new")}
        >
          <Plus size={20} strokeWidth={2} />
          <span className={styles.addButtonLabel}>Add Warehouse</span>
        </button>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by warehouse name or location..."
      />

      <DataTable
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        columns={columns}
        rows={warehouses}
        isLoading={isLoading}
        emptyMessage="No warehouses found."
        emptyActionLabel="Add your first warehouse"
        onEmptyAction={() => navigate("/warehouses/new")}
        renderActions={(row) => (
          <div className={styles.actions}>
            <button
              type="button"
              aria-label={`Edit ${row.name}`}
              className={styles.iconButton}
              onClick={() => navigate(`/warehouses/${row.id}/edit`)}
            >
              <Pencil size={16} />
            </button>

            <button
              type="button"
              aria-label={`Delete ${row.name}`}
              className={`${styles.iconButton} ${styles.danger}`}
              onClick={() => handleDelete(row)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      />
    </div>
  );
}
