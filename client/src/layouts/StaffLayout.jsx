import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowLeftRight, History, UserCircle, Menu } from 'lucide-react';
import LogoutButton from '../components/common/LogoutButton';
import styles from './StaffLayout.module.css';

// Flat route namespace, matching the real AppRoutes.jsx convention.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/stock', label: 'Stock In/Out', icon: ArrowLeftRight },
  { to: '/transactions', label: 'Transactions', icon: History },
  { to: '/profile', label: 'Profile', icon: UserCircle },
];

export default function StaffLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.brand}>WMS</div>
          <button
            type="button"
            className={styles.menuToggle}
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
            aria-controls="staff-nav-panel"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <Menu size={22} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <nav
          id="staff-nav-panel"
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
