import { defineProject } from 'vitest/config';
import { actviewPlugin } from '@actview/plugin-vite';
import path from 'path';

export default defineProject({
  plugins: [actviewPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        pretendToBeVisual: true,
        url: 'http://localhost',
      },
    },
    setupFiles: ['./test/setupVitest.ts'],
    exclude: ['node_modules', 'build', '**/*.spec.*'],
    retry: process.env.CI ? 1 : 0,
  },
});
