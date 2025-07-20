import { createFileRoute } from '@tanstack/react-router';
import { RunsPage } from '../components/runs-page';

export const Route = createFileRoute('/runs')({
  component: RunsPage,
});
