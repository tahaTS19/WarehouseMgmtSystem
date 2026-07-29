import styles from './StatCard.module.css';

/**
 * Small reusable card for a single dashboard summary number.
 * icon: a lucide-react icon component (passed as a reference, not JSX)
 * accent: true for numbers that need visual emphasis (e.g. low stock)
 */
export default function StatCard({ icon: Icon, label, value, accent = false }) {
  return (
    <div className={accent ? `${styles.card} ${styles.accent}` : styles.card}>
      <div className={styles.iconWrap}>
        <Icon size={20} strokeWidth={2} aria-hidden="true" />
      </div>
      <div className={styles.text}>
        <span className={styles.value}>{value}</span>
        <span className={styles.label}>{label}</span>
      </div>
    </div>
  );
}
