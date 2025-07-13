/// <reference types="vite/client" />
import React from 'react';
import { Sidebar } from '@/components/sidebar';
import { ThemeProvider } from '@/components/theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme='dark' storageKey='ui-theme'>
          <div className='flex h-screen bg-[hsl(var(--background))]'>
            <Sidebar />
            <main className='flex-1 overflow-y-auto p-8'>
              <Outlet />
            </main>
          </div>
        </ThemeProvider>
      </QueryClientProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body className='bg-[hsl(var(--background))] text-[hsl(var(--foreground))]'>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
