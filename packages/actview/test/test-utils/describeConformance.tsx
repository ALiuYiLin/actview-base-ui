import { describe, expect, it } from 'vitest';

export interface DescribeConformanceOptions {
  render: (node: any) => Promise<any>;
  refInstanceof?: any;
}

/**
 * React 版 `describeConformance` 的 actview 简化版：
 * 校验组件可渲染，且根元素类型匹配 `refInstanceof`。
 */
export function describeConformance(node: any, getOptions: () => DescribeConformanceOptions) {
  describe('conformance', () => {
    it('renders without crashing', async () => {
      const {render} = getOptions();
      await render(node);
    });

    if (getOptions().refInstanceof) {
      it('applies the ref to the root element', async () => {
        const {render, refInstanceof} = getOptions();
        const result = await render(node);
        const root = result.container.querySelector(':scope > *');
        expect(root).not.toBe(null);
        expect(root).toBeInstanceOf(refInstanceof);
      });
    }
  });
}
