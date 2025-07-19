import { createFileRoute } from '@tanstack/react-router';
import { AnalyticsPage } from '../components/analytics-page';

export const Route = createFileRoute('/analytics')({
  component: AnalyticsPage,
});