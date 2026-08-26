import { expect } from 'vitest';
import { createElement } from '@actview/jsx';
import type { VNode } from '@actview/jsx';
import { flushMicrotasks, randomStringValue } from '../test-utils';
// @actview/testing 的 screen 只查询 render 容器；Teleport 内容挂载在 body 的
// portal node（React 版 createPortal 语义）——用 @testing-library/dom 的
// screen（查 document.body）对齐 React 版查询行为。
import { screen } from '@testing-library/dom';
import type { BaseUiConformanceTestsOptions } from '../describeConformance';
import { cloneVNode } from '../test-utils/cloneVNode';
import { throwMissingPropError } from './utils';

export function testPropForwarding(
  element: VNode,
  getOptions: () => BaseUiConformanceTestsOptions,
) {
  const { render, testRenderPropWith: Element = 'div', button = false } = getOptions();

  if (!render) {
    throwMissingPropError('render');
  }

  const nativeButton = Element === 'button';

  describe('prop forwarding', () => {
    it('forwards custom props to the default element', async () => {
      const otherProps = {
        lang: 'fr',
        'data-foobar': randomStringValue(),
      };

      await render(cloneVNode(element, { 'data-testid': 'root', ...otherProps }));

      await flushMicrotasks();

      const customRoot = screen.getByTestId('root');
      expect(customRoot).toHaveAttribute('lang', otherProps.lang);
      expect(customRoot).toHaveAttribute('data-foobar', otherProps['data-foobar']);
    });

    it('forwards custom props to the customized element defined with a function', async () => {
      const otherProps = {
        lang: 'fr',
        'data-foobar': randomStringValue(),
        ...(button && { nativeButton }),
      };

      await render(
        cloneVNode(element, {
          // 动态标签用 createElement（actview 的 IntrinsicElements 带索引签名，
          // keyof 含 number，`<Element />` 过不了 JSX 类型检查）
          render: (props: any) => {
            return createElement(Element, { ...props, 'data-testid': 'custom-root' });
          },
          ...otherProps,
        }),
      );

      await flushMicrotasks();

      const customRoot = screen.getByTestId('custom-root');
      expect(customRoot).toHaveAttribute('lang', otherProps.lang);
      expect(customRoot).toHaveAttribute('data-foobar', otherProps['data-foobar']);
    });

    it('forwards custom props to the customized element defined using JSX', async () => {
      const otherProps = {
        lang: 'fr',
        'data-foobar': randomStringValue(),
        ...(button && { nativeButton }),
      };

      await render(
        cloneVNode(element, {
          render: createElement(Element, { 'data-testid': 'custom-root' }),
          ...otherProps,
        }),
      );

      await flushMicrotasks();

      const customRoot = screen.getByTestId('custom-root');
      expect(customRoot).toHaveAttribute('lang', otherProps.lang);
      expect(customRoot).toHaveAttribute('data-foobar', otherProps['data-foobar']);
    });

    it('forwards the custom `style` attribute defined on the component', async () => {
      await render(
        cloneVNode(element, {
          style: { color: 'green' },
          'data-testid': 'custom-root',
        }),
      );

      await flushMicrotasks();

      const customRoot = screen.getByTestId('custom-root');
      expect(customRoot).toHaveAttribute('style');
      expect(customRoot.getAttribute('style')).toContain('color: green');
    });

    it('forwards the custom `style` attribute defined on the render function', async () => {
      await render(
        cloneVNode(element, {
          render: (props: any) => {
            return createElement(Element, {
              ...props,
              style: { color: 'green' },
              'data-testid': 'custom-root',
            });
          },
          ...(button && { nativeButton }),
        }),
      );

      await flushMicrotasks();

      const customRoot = screen.getByTestId('custom-root');
      expect(customRoot).toHaveAttribute('style');
      expect(customRoot.getAttribute('style')).toContain('color: green');
    });

    it('forwards the custom `style` attribute defined on the render function', async () => {
      await render(
        cloneVNode(element, {
          render: createElement(Element, {
            style: { color: 'green' },
            'data-testid': 'custom-root',
          }),
          ...(button && { nativeButton }),
        }),
      );

      await flushMicrotasks();

      const customRoot = screen.getByTestId('custom-root');
      expect(customRoot).toHaveAttribute('style');
      expect(customRoot.getAttribute('style')).toContain('color: green');
    });
  });
}
