import { createFileRoute } from '@tanstack/react-router';
import { SystemPage } from '../components/system-page';

export const Route = createFileRoute('/system')({
  component: SystemPage,
});
