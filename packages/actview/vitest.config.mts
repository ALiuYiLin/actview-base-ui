import { defineProject } from 'vitest/config';
import { actviewPlugin } from '@actview/plugin-vite';
import actviewScopedPlugin from '@actview/plugin-scoped';
import { playwright } from '@vitest/browser-playwright';
import path from 'path';

// actview 组件转换只应作用于本仓库源码与测试文件。node_modules 的第三方
// .js/.ts 库（如 vitest 的 @vitest/expect dist）会被大写开头的普通函数
// （JestExtendPlugin 等工厂）误判为组件并触发 setup 风格报错——拦截跳过。
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

export default defineProject({
  plugins: [scopedActviewPlugin(), ...actviewScopedPlugin()],
  resolve: {
    dedupe: ['@actview/core', '@actview/jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '#': path.resolve(__dirname),
      // @floating-ui/actview 走源码（vite 转译）——与 floating-ui/actview
      // 自身测试一致（其测试直接 import src）；dist 仅用于包解析/类型。
      '@actview/floating-ui/utils': path.resolve(
        'E:/code3/floating-ui/packages/actview/src/utils.ts',
      ),
      '@actview/floating-ui': path.resolve(
        'E:/code3/floating-ui/packages/actview/src/index.ts',
      ),
      // @actview/base-ui-utils 走源码（聚合 index）——测试不依赖 dist 构建产物。
      '@actview/base-ui-utils': path.resolve(
        __dirname,
        '../actview-utils/src/index.ts',
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
    // 双环境（对齐 floating-ui/actview）：默认 jsdom 跑 skipIf(!isJSDOM) 用例；
    // VITEST_ENV=browser 时用 Playwright Chromium 跑 skipIf(isJSDOM) 用例
    // （真实布局/动画帧/iframe 等）——两环境合起来零跳过。
    browser: {
      provider: playwright(),
      enabled: process.env.VITEST_ENV === 'browser',
      instances: [{ browser: 'chromium' }],
    },
  },
});

