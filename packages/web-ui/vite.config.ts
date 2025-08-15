import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    jsx: 'automatic',
    supported: {
      'top-level-await': true,
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: [
            'react',
            'react-dom',
            '@tanstack/react-router',
            '@clerk/tanstack-react-start',
          ],
          ui: [
            '@/components/ui/index.ts',
          ],
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      // This is needed to handle "use client" directives
      supported: {
        'top-level-await': true,
      },
      plugins: [
        {
          name: 'remove-use-client',
          setup(build) {
            build.onLoad({ filter: /\.[jt]sx?$/ }, async (args) => {
              const fs = await import('fs');
              let contents = await fs.promises.readFile(args.path, 'utf8');
              
              // Remove "use client" directive
              contents = contents.replace(/["']use client["'];?(\r\n|\n)?/g, '');
              
              return {
                contents,
                loader: args.path.endsWith('x') ? 'jsx' : 'js',
              };
            });
          },
        },
      ],
    },
  },
});
