import { defineConfig } from 'vite';
import { actviewPlugin } from '@actview/plugin-vite';
import path from 'path';

export default defineConfig({
  plugins: [actviewPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '#': path.resolve(__dirname),
    },
  },
});