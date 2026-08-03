import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './ProtectedRoute.module.css';

// Guards a whole BRANCH of nested routes at once via <Outlet />, rather than
// wrapping each protected page individually. This matters as more protected
// routes are added (Warehouses, Products, etc. in Week 2) — they all get
// covered just by nesting under this route, no per-page wrapping needed.
//
// As before: this is a UX convenience only, not a security boundary — the
// real access control lives entirely in the backend guards.
export default function ProtectedRoute({ allowedRoles }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <span className={styles.loadingText}>Loading…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
