import { useState } from 'react';
import LowStockReport from './LowStockReport';
import InventoryValueReport from './InventoryValueReport';
import ProductMovementReport from './ProductMovementReport';
import RecentTransactionsReport from './RecentTransactionsReport';
import styles from './ReportsPage.module.css';

const TABS = [
  { key: 'lowStock', label: 'Low Stock' },
  { key: 'inventoryValue', label: 'Inventory Value' },
  { key: 'productMovement', label: 'Product Movement' },
  { key: 'recentTransactions', label: 'Recent Transactions' },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('lowStock');

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Reports</h1>

      <div className={styles.tabs} role="tablist" aria-label="Report sections">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={
              activeTab === tab.key ? `${styles.tabButton} ${styles.tabButtonActive}` : styles.tabButton
            }
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.tabPanel}>
        {activeTab === 'lowStock' && <LowStockReport />}
        {activeTab === 'inventoryValue' && <InventoryValueReport />}
        {activeTab === 'productMovement' && <ProductMovementReport />}
        {activeTab === 'recentTransactions' && <RecentTransactionsReport />}
      </div>
    </div>
  );
}
