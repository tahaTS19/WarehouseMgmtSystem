import { useState } from 'react';
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
  Menu,
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.brand}>WMS</div>
          {/* Only visible below the mobile breakpoint (CSS-driven) — on
              desktop the full nav is always shown, this button does nothing. */}
          <button
            type="button"
            className={styles.menuToggle}
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
            aria-controls="admin-nav-panel"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <Menu size={22} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <nav
          id="admin-nav-panel"
          className={isMenuOpen ? `${styles.nav} ${styles.navOpen}` : styles.nav}
        >
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              onClick={() => setIsMenuOpen(false)}
              className={({ isActive }) =>
                isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
              }
            >
              <Icon size={18} strokeWidth={2} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
          <div className={styles.sidebarFooter}>
            <LogoutButton />
          </div>
        </nav>
      </aside>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
