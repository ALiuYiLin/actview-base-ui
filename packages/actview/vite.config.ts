import { defineConfig } from 'vite';
import { actviewPlugin } from '@actview/plugin-vite';
import actviewScopedPlugin from '@actview/plugin-scoped';
import path from 'path';

export default defineConfig({
  plugins: [actviewPlugin(), ...actviewScopedPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '#': path.resolve(__dirname),
    },
  },
});