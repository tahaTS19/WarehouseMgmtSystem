import LogoutButton from '../../components/common/LogoutButton';

// Temporary placeholder — the real dashboard is built in Week 3. Exists here
// purely to prove the full auth flow (login → protected route → logout)
// works end to end.
export default function DashboardPlaceholder() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'var(--font-body)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Dashboard</h1>
        <LogoutButton />
      </div>
      <p>You're signed in. The real dashboard is built in Week 3.</p>
    </div>
  );
}
