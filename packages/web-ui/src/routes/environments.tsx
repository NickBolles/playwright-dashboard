import { createFileRoute } from '@tanstack/react-router';
import { EnvironmentsPage } from '../components/environments-page';

export const Route = createFileRoute('/environments')({
  component: EnvironmentsPage,
});