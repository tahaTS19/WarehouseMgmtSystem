import { useAuth } from '../context/AuthContext';
import AdminLayout from './AdminLayout';
import StaffLayout from './StaffLayout';

/**
 * Sits between ProtectedRoute and the actual page routes. Picks which
 * sidebar shell to render based on role, while the routes themselves stay
 * flat (/dashboard, /products, etc.) — shared pages like Dashboard branch
 * internally on role instead of living at two separate URLs.
 */
export default function RoleLayout() {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AdminLayout /> : <StaffLayout />;
}
