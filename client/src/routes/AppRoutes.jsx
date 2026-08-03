import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ProtectedRoute from './ProtectedRoute';
import RoleLayout from '../layouts/RoleLayout';
import Dashboard from '../pages/dashboard/Dashboard';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Any route nested under this element is guarded by ProtectedRoute.
          RoleLayout picks AdminLayout vs StaffLayout based on role, so
          Week 2 additions (Warehouses/Products/Categories/etc) just nest
          here too — same flat paths, same guard, same layout switch. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
