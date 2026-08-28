import { expect } from 'vitest';
import type { VNode } from '@actview/jsx';
import type { BaseUiConformanceTestsOptions } from '../describeConformance';
import { throwMissingPropError } from './utils';

export function testClassName(
  element: VNode,
  getOptions: () => BaseUiConformanceTestsOptions,
) {
  const Target = element.type as any;

  // 组件函数形式：Host 组件函数合并 props，返回真 vnode（兼容 family
  // render 包装器的 render(node.type, {...node.props}) 契约）。
  function renderElementWith(extraProps: Record<string, any>) {
    function Host() {
      return <Target {...(element.props ?? {})} {...extraProps} />;
    }
    return <Host />;
  }

  describe('prop: className', () => {
    const { render } = getOptions();

    if (!render) {
      throwMissingPropError('render');
    }

    it('should apply the className when passed as a string', async () => {
      await render(renderElementWith({ className: 'test-class' }));
      expect(document.querySelector('.test-class')).not.toBe(null);
    });
  });
}
