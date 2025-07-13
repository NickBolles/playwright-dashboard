import React from 'react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/marketting-page')({
  component: RouteComponent,
});

// TODO: marketting site: https://www.launchuicomponents.com/docs/
function RouteComponent() {
  return <div>Hello &quot;/marketting-page&quot;!</div>;
}
