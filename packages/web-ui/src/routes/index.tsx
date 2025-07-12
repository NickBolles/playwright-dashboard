import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Playwright Dashboard</h1>
      <p>Welcome to your Playwright test orchestration dashboard.</p>
      <div>
        <h2>Quick Actions</h2>
        <ul>
          <li>View test runs</li>
          <li>Schedule new tests</li>
          <li>Monitor environments</li>
          <li>Check system status</li>
        </ul>
      </div>
    </div>
  );
}
