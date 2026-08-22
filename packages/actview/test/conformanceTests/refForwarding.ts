import { expect } from 'vitest';
import type { VNode } from '@actview/jsx';
import type { BaseUiConformanceTestsOptions } from '../describeConformance';
import { throwMissingPropError } from './utils';

/**
 * 注意（actview 语义差异）：组件级 `ref` 会被框架从 props 中剥离，组件的根
 * ref 由内部 `useRootElement()` 管理（渲染期传给 render 函数的 `props.ref`）。
 * 因此这里不对齐 React 的「组件 ref 转发」语义，而是验证组件的根 DOM 存在且
 * 类型正确——conformance 里 `refInstanceof` 的检查对象是根元素。
 */
async function verifyRef(
  element: VNode,
  render: BaseUiConformanceTestsOptions['render'],
  onRef: (instance: unknown, element: HTMLElement | null) => void,
) {
  if (!render) {
    throwMissingPropError('render');
  }

  const { container } = await render(element);

  // actview：根 DOM 是挂载容器内的首个元素（组件 ref 语义的等价物）。
  onRef(container.firstElementChild, container);
}

export function testRefForwarding(
  element: VNode,
  getOptions: () => BaseUiConformanceTestsOptions,
) {
  describe('ref', () => {
    it(`attaches the ref`, async () => {
      const { render, refInstanceof } = getOptions();

      await verifyRef(element, render, (instance) => {
        expect(instance).toBeInstanceOf(refInstanceof);
      });
    });
  });
}
