import { defineProject } from 'vitest/config';
import { actviewPlugin } from '@actview/plugin-vite';
import actviewScopedPlugin from '@actview/plugin-scoped';
import path from 'path';

export default defineProject({
  plugins: [actviewPlugin(), ...actviewScopedPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '#': path.resolve(__dirname),
      // @floating-ui/actview 走源码（vite 转译）——与 floating-ui/actview
      // 自身测试一致（其测试直接 import src）；dist 仅用于包解析/类型。
      '@floating-ui/actview/utils': path.resolve(
        'E:/code3/floating-ui/packages/actview/src/utils.ts',
      ),
      '@floating-ui/actview': path.resolve(
        'E:/code3/floating-ui/packages/actview/src/index.ts',
      ),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
    __DEV__: 'true',
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
