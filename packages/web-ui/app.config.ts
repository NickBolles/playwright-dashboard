import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tsConfigPaths(),
    tanstackStart({
      prerender: {
        enabled: true,
        outputPath: 'dist/prerender',
        crawlLinks: true,
        retryCount: 3,
        retryDelay: 1000,
        onSuccess: args => {
          console.log('Prerender success', args);
        },
      },
    }),
  ],
});
