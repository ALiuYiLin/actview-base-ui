import { expect } from 'vitest';
import type { VNode } from '@actview/jsx';
import type { BaseUiConformanceTestsOptions } from '../describeConformance';
import { cloneVNode } from '../test-utils/cloneVNode';
import { throwMissingPropError } from './utils';

export function testClassName(
  element: VNode,
  getOptions: () => BaseUiConformanceTestsOptions,
) {
  describe('prop: className', () => {
    const { render } = getOptions();

    if (!render) {
      throwMissingPropError('render');
    }

    it('should apply the className when passed as a string', async () => {
      await render(cloneVNode(element, { className: 'test-class' }));
      expect(document.querySelector('.test-class')).not.toBe(null);
    });
  });
}
