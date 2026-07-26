import styles from './AuthLayout.module.css';

const RACK_ROWS = 3;
const RACK_COLS = 4;
const LIT_CELL = { row: 1, col: 2 }; // the "tracked" unit — the page's visual signature

function RackSignature() {
  const cellSize = 34;
  const gap = 10;
  const width = RACK_COLS * cellSize + (RACK_COLS - 1) * gap;
  const height = RACK_ROWS * cellSize + (RACK_ROWS - 1) * gap;

  const cells = [];
  for (let r = 0; r < RACK_ROWS; r++) {
    for (let c = 0; c < RACK_COLS; c++) {
      const isLit = r === LIT_CELL.row && c === LIT_CELL.col;
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={c * (cellSize + gap)}
          y={r * (cellSize + gap)}
          width={cellSize}
          height={cellSize}
          rx="4"
          className={isLit ? styles.cellLit : styles.cell}
        />
      );
    }
  }

  return (
    <svg
      className={styles.signature}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden="true"
    >
      {cells}
    </svg>
  );
}

export default function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div className={styles.page}>
      <aside className={styles.panel}>
        <div className={styles.panelContent}>
          <div className={styles.wordmark}>WMS</div>
          <RackSignature />
          <p className={styles.tagline}>Every unit, accounted for.</p>
          <p className={styles.taglineSub}>
            One record for every warehouse you run — who moved it, when, and why.
          </p>
        </div>
      </aside>
      <main className={styles.formSide}>
        <div className={styles.formWrap}>
          {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}
