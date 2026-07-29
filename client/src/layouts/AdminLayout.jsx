import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Warehouse,
  Users,
  Package,
  Tag,
  Truck,
  ArrowLeftRight,
  History,
  BarChart3,
  UserCircle,
} from 'lucide-react';
import LogoutButton from '../components/common/LogoutButton';
import styles from './AdminLayout.module.css';

// Flat route namespace, matching the real AppRoutes.jsx convention — Week 2
// routes (Warehouses, Products, etc.) will be added as plain top-level paths,
// not prefixed by role, since Dashboard itself is shared and role-branches
// internally rather than living at two separate URLs.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/warehouses', label: 'Warehouses', icon: Warehouse },
  { to: '/employees', label: 'Employees', icon: Users },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/categories', label: 'Categories', icon: Tag },
  { to: '/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/stock', label: 'Stock In/Out', icon: ArrowLeftRight },
  { to: '/transactions', label: 'Transactions', icon: History },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/profile', label: 'Profile', icon: UserCircle },
];

export default function AdminLayout() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>WMS</div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
              }
            >
              <Icon size={18} strokeWidth={2} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <LogoutButton />
        </div>
      </aside>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
