import { defineConfig } from 'vite';
import path from 'path';

// 发布构建：把 src 的 TS 转译成单个 ESM 产物（dist/index.mjs）。
// peerDependencies 与 dependencies 一律 external——由宿主/安装方提供。
// 插件用动态 import：@actview/plugin-* 是 ESM-only 包，vite 配置加载器
// 对顶层 import 走 require 会失败。
export default defineConfig(async () => {
  const [{actviewPlugin}, {default: actviewScopedPlugin}] = await Promise.all([
    import('@actview/plugin-vite'),
    import('@actview/plugin-scoped'),
  ]);

  return {
    plugins: [actviewPlugin(), ...actviewScopedPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '#': path.resolve(__dirname),
      },
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, 'src/index.ts'),
        formats: ['es'],
        fileName: 'index',
      },
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
      rollupOptions: {
        external: [
          '@actview/core',
          '@actview/jsx',
          'actview',
          '@floating-ui/utils',
          'reselect',
        ],
      },
    },
  };
});
