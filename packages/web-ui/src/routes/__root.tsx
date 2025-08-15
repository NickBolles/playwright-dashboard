/// <reference types="vite/client" />
import React from 'react';
import { Sidebar } from '@/components/sidebar';
import { ThemeProvider } from '@/components/theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/tanstack-react-start';
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router';
import appCss from '../index.css?url';

import type { ReactNode } from 'react';

const queryClient = new QueryClient();

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
    title: 'Playwright Dashboard',
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme='dark' storageKey='ui-theme'>
            <Outlet />
          </ThemeProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body className='bg-background text-foreground'>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
