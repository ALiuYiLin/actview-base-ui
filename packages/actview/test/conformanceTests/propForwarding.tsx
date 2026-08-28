import { expect } from 'vitest';
import type { VNode } from '@actview/jsx';
import { flushMicrotasks, randomStringValue } from '../test-utils';
// @actview/testing 的 screen 只查询 render 容器；Teleport 内容挂载在 body 的
// portal node（React 版 createPortal 语义）——用 @testing-library/dom 的
// screen（查 document.body）对齐 React 版查询行为。
import { screen } from '@testing-library/dom';
import type { BaseUiConformanceTestsOptions } from '../describeConformance';
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

  // 组件函数形式：不用 cloneVNode / createElement——动态原生标签用内置
  // `<component is>`；目标组件经 Host 组件函数合并 props（返回真 vnode，
  // 兼容 family render 包装器的 render(node.type, {...node.props}) 契约）。
  const Target = element.type as any;

  function renderElementWith(extraProps: Record<string, any>) {
    function Host() {
      return <Target {...(element.props ?? {})} {...extraProps} />;
    }
    return <Host />;
  }

  describe('prop forwarding', () => {
    it('forwards custom props to the default element', async () => {
      const otherProps = {
        lang: 'fr',
        'data-foobar': randomStringValue(),
      };

      await render(renderElementWith({ 'data-testid': 'root', ...otherProps }));

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
        renderElementWith({
          render: (props: any) => {
            return <component is={Element} {...props} data-testid="custom-root" />;
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
        renderElementWith({
          render: <component is={Element} data-testid="custom-root" />,
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
        renderElementWith({
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
        renderElementWith({
          render: (props: any) => {
            return (
              <component
                is={Element}
                {...props}
                style={{ color: 'green' }}
                data-testid="custom-root"
              />
            );
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
        renderElementWith({
          render: <component is={Element} style={{ color: 'green' }} data-testid="custom-root" />,
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
