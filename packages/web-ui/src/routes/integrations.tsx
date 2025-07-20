import { createFileRoute } from '@tanstack/react-router';
import { IntegrationsPage } from '../components/integrations-page';

export const Route = createFileRoute('/integrations')({
  component: IntegrationsPage,
});
