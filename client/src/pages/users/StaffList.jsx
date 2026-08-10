import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import SearchBar from "../../components/common/SearchBar";
import toast from "react-hot-toast";
import { api } from "../../services/apiClient";
import DataTable from "../../components/common/DataTable";
import { getErrorMessage } from "../../utils/getErrorMessage";
import styles from "./StaffList.module.css";

export default function StaffList() {
  const navigate = useNavigate();

  const [staff, setStaff] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  //pagination
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
  }, [debouncedSearch, warehouseFilter, statusFilter]);

  const loadData = useCallback(async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams();

      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }

      if (warehouseFilter) {
        params.append("warehouseId", warehouseFilter);
      }

      if (statusFilter) {
        params.append("status", statusFilter);
      }

      params.append("page", page.toString());
      params.append("limit", "10"); //limit

      const [usersData, warehousesData] = await Promise.all([
        api.get(`/users?${params.toString()}`),
        api.get("/warehouses?all=true"),
      ]);

      setStaff(usersData.data);
      setTotalPages(usersData.totalPages);
      setWarehouses(warehousesData);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not load staff."));
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, warehouseFilter, statusFilter, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const warehouseNameById = useMemo(() => {
    const map = new Map();

    warehouses.forEach((warehouse) => {
      map.set(warehouse.id, warehouse.name);
    });

    return map;
  }, [warehouses]);

  async function handleDelete(person) {
    const confirmed = window.confirm(
      `Delete "${person.name}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      await api.delete(`/users/${person.id}`);

      toast.success("Staff account deleted.");

      setStaff((current) => current.filter((staff) => staff.id !== person.id));
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete this staff account."));
    }
  }

  const columns = [
    {
      key: "name",
      header: "Name",
    },
    {
      key: "phone",
      header: "Phone",
      render: (row) => row.phone || "—",
    },
    {
      key: "warehouseId",
      header: "Warehouse",
      render: (row) => warehouseNameById.get(row.warehouseId) ?? "—",
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (row.status === "active" ? "Active" : "Inactive"),
    },
    {
      key: "createdAt",
      header: "Joined",
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Staff</h1>

        <button
          type="button"
          className={styles.addButton}
          aria-label="Add Staff"
          onClick={() => navigate("/employees/new")}
        >
          <Plus size={20} strokeWidth={2} aria-hidden="true" />
          <span className={styles.addButtonLabel}>Add Staff</span>
        </button>
      </div>

      <div className={styles.filters}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search staff..."
        />

        <select
          className={styles.select}
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
        >
          <option value="">All Warehouses</option>

          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>

        <select
          className={styles.select}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <DataTable
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        columns={columns}
        rows={staff}
        isLoading={isLoading}
        emptyMessage="No staff accounts yet."
        emptyActionLabel="Add your first staff member"
        onEmptyAction={() => navigate("/employees/new")}
        renderActions={(row) => (
          <div className={styles.actions}>
            <button
              type="button"
              aria-label={`Edit ${row.name}`}
              className={styles.iconButton}
              onClick={() => navigate(`/employees/${row.id}/edit`)}
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
