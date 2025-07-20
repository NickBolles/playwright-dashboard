import { createFileRoute } from '@tanstack/react-router';
import { WebhooksPage } from '../components/webhooks-page';

export const Route = createFileRoute('/webhooks')({
  component: WebhooksPage,
});
