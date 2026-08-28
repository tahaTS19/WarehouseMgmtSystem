import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ProtectedRoute from './ProtectedRoute';
import RoleLayout from '../layouts/RoleLayout';
import Dashboard from '../pages/dashboard/Dashboard';
import WarehousesList from '../pages/warehouses/WarehousesList';
import WarehouseForm from '../pages/warehouses/WarehouseForm';
import StaffList from '../pages/users/StaffList';
import StaffForm from '../pages/users/StaffForm';
import CategoriesList from '../pages/categories/CategoriesList';
import CategoryForm from '../pages/categories/CategoryForm';
import SuppliersList from '../pages/suppliers/SuppliersList';
import SupplierForm from '../pages/suppliers/SupplierForm';
import ProductsList from '../pages/products/ProductsList';
import ProductForm from '../pages/products/ProductForm';
import TransactionsList from '../pages/transactions/TransactionsList';
import TransactionForm from '../pages/transactions/TransactionForm';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<RoleLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Admin-only branch — nesting ProtectedRoute again adds the role
              check on top of "just logged in". Staff hitting these URLs
              directly get redirected by ProtectedRoute's allowedRoles check. */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/warehouses" element={<WarehousesList />} />
            <Route path="/warehouses/new" element={<WarehouseForm />} />
            <Route path="/warehouses/:id/edit" element={<WarehouseForm />} />

            {/* Route path is /employees to match the existing AdminLayout
                nav link — the folder is pages/users/ per this task's
                convention. Deliberate naming split, not a mismatch. */}
            <Route path="/employees" element={<StaffList />} />
            <Route path="/employees/new" element={<StaffForm />} />
            <Route path="/employees/:id/edit" element={<StaffForm />} />

            <Route path="/categories" element={<CategoriesList />} />
            <Route path="/categories/new" element={<CategoryForm />} />
            <Route path="/categories/:id/edit" element={<CategoryForm />} />

            <Route path="/suppliers" element={<SuppliersList />} />
            <Route path="/suppliers/new" element={<SupplierForm />} />
            <Route path="/suppliers/:id/edit" element={<SupplierForm />} />

            <Route path="/products" element={<ProductsList />} />
            <Route path="/products/new" element={<ProductForm />} />
            <Route path="/products/:id/edit" element={<ProductForm />} />
          </Route>

          {/* Transactions are ADMIN, STAFF per the doc — not nested under
              the admin-only ProtectedRoute above. No :id/edit route at all:
              this module is create + list/view only, immutable audit log. */}
          <Route path="/transactions" element={<TransactionsList />} />
          <Route path="/transactions/new" element={<TransactionForm />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
