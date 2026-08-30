import { defineConfig } from 'vite';
import { actviewPlugin } from '@actview/plugin-vite';
import actviewScopedPlugin from '@actview/plugin-scoped';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 手动调试 @actview/base-ui 源码的 playground。
// 关键点：
//   - actviewPlugin()：对 .tsx/.ts 做 defineComponent 转换（组件函数 → {__setup}）
//   - esbuild jsx automatic + jsxImportSource: '@actview/jsx'（顶层非组件 JSX，
//     如 main.tsx 里的 <App />，由 esbuild 编译）
//   - alias：@actview/base-ui / @ / # 全部指向 packages/actview 源码，改组件
//     源码即时生效（vite HMR）；node_modules 段之外的路径不触发 babel 排除
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MONOREPO = path.resolve(ROOT, '..', '..');
const ACTVIEW_PKG = path.resolve(MONOREPO, 'packages', 'actview');

// 与 vitest.config.mts 相同的防护：node_modules 的第三方 .js/.ts 不转换。
function scopedActviewPlugin() {
  const inner = actviewPlugin();
  const originalTransform = inner.transform.bind(inner);
  return {
    ...inner,
    transform(code: string, id: string) {
      const cleanId = id.split('?')[0];
      const normalized = cleanId.replace(/\\/g, '/');
      if (normalized.includes('/node_modules/')) {
        return null;
      }
      return originalTransform(code, id);
    },
  };
}

export default defineConfig({
  root: ROOT,
  plugins: [scopedActviewPlugin(), ...actviewScopedPlugin()],
  define: {
    // floating-ui/actview 源码（alias 到 E:/code3/floating-ui）用 __DEV__ 守卫
    // 开发警告（utils/log.ts 等），与测试配置（vitest.config.mts）一致。
    __DEV__: 'true',
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: '@actview/jsx',
  },
  resolve: {
    dedupe: ['@actview/core', '@actview/jsx'],
    alias: {
      // base-ui 源码（用户要调试的就是这里，alias 到 src 让改动即时生效）
      '@actview/base-ui': path.resolve(ACTVIEW_PKG, 'src'),
      '@': path.resolve(ACTVIEW_PKG, 'src'),
      '#': ACTVIEW_PKG,
      // @actview/base-ui-utils 走源码（聚合 index）——与测试配置一致。
      '@actview/base-ui-utils': path.resolve(MONOREPO, 'packages', 'actview-utils', 'src', 'index.ts'),
      // @actview/floating-ui 走源码（vite 转译）——与 floating-ui/actview 测试一致。
      '@actview/floating-ui': path.resolve('E:/code3/floating-ui/packages/actview/src/index.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['@actview/base-ui', '@actview/base-ui-utils', '@actview/floating-ui'],
  },
  server: {
    fs: {
      // 允许从 monorepo 根与 floating-ui 源码目录提供文件。
      allow: [MONOREPO, 'E:/code3/floating-ui'],
    },
    port: 5199,
  },
});
