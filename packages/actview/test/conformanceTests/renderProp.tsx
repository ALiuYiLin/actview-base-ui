import { defineComponent, ref } from 'actview';
import type { Ref } from 'actview';
import { expect } from 'vitest';
import { createElement } from '@actview/jsx';
import type { VNode } from '@actview/jsx';
import { randomStringValue, screen } from '../test-utils';
import type { BaseUiConformanceTestsOptions } from '../describeConformance';
import { cloneVNode } from '../test-utils/cloneVNode';
import { throwMissingPropError } from './utils';

export function testRenderProp(
  element: VNode,
  getOptions: () => BaseUiConformanceTestsOptions,
) {
  const {
    render,
    testRenderPropWith: Element = 'div',
    button = false,
    wrappingAllowed = true,
  } = getOptions();

  if (!render) {
    throwMissingPropError('render');
  }

  const nativeButton = Element === 'button';

  // actview 无 forwardRef：Wrapper 把 props 原样展开到自定义根元素上
  // （动态标签用 createElement——IntrinsicElements 带索引签名，`<Element />`
  // 过不了 JSX 类型检查）。ref 合并语义由组件传入的 props.ref 承担。
  const Wrapper = defineComponent(function (props: any) {
    return () => {
      const inner = createElement(Element, { ...props, 'data-testid': 'wrapped' });
      return wrappingAllowed ? <div data-testid="base-ui-wrapper">{inner}</div> : inner;
    };
  });

  describe('prop: render', () => {
    it('renders a customized root element with a function', async () => {
      const testValue = randomStringValue();

      await render(
        cloneVNode(element, {
          render: (props: any) => {
            const { key, ...propsWithoutKey } = props;
            return <Wrapper key={key} {...propsWithoutKey} data-test-value={testValue} />;
          },
          ...(button && { nativeButton }),
        }),
      );

      if (wrappingAllowed) {
        expect(screen.queryByTestId('base-ui-wrapper')).not.toBe(null);
      }
      expect(screen.queryByTestId('wrapped')).not.toBe(null);
      expect(screen.queryByTestId('wrapped')).toHaveAttribute('data-test-value', testValue);
    });

    it('renders a customized root element with an element', async () => {
      const testValue = randomStringValue();

      await render(
        cloneVNode(element, {
          render: <Wrapper data-test-value={testValue} />,
          ...(button && { nativeButton }),
        }),
      );

      if (wrappingAllowed) {
        expect(screen.queryByTestId('base-ui-wrapper')).not.toBe(null);
      }
      expect(screen.queryByTestId('wrapped')).not.toBe(null);
      expect(screen.queryByTestId('wrapped')).toHaveAttribute('data-test-value', testValue);
    });

    it('renders a customized root element with an element', async () => {
      await render(
        cloneVNode(element, {
          render: <Wrapper />,
          ...(button && { nativeButton: Element === 'button' }),
        }),
      );

      if (wrappingAllowed) {
        expect(screen.queryByTestId('base-ui-wrapper')).not.toBe(null);
      } else {
        expect(screen.queryByTestId('wrapped')).not.toBe(null);
      }
    });

    it('should pass the ref to the custom component', async () => {
      // 函数形态（本用例专属语义）：render 函数能拿到 hook 传入的合并链 ref，
      // 且透传到自定义元素后指向其根 DOM。
      let refFromRenderProp: Ref<HTMLElement | null> | null = null;

      await render(
        cloneVNode(element, {
          render: (props: any) => {
            refFromRenderProp = props.ref;
            return createElement(Element, { ...props, 'data-testid': 'wrapped' });
          },
          'data-testid': 'wrapped',
          ...(button && { nativeButton }),
        }),
      );

      expect(refFromRenderProp).not.toBe(null);
      expect(refFromRenderProp!.value).not.toBe(null);
      expect(refFromRenderProp!.value!.tagName).toBe(Element.toUpperCase());
      expect(refFromRenderProp!.value).toHaveAttribute('data-testid', 'wrapped');
    });

    it('should merge the rendering element ref with the custom component ref', async () => {
      // 组件函数形式：render 自定义组件自带 ref（VNode 的 props.ref）——
      // hook 经 getReactElementRef 把它并入合并链；组件函数内用
      // createElement(Element, {...props}) 动态渲染（ref 随 props 透传到
      // 根元素），合并链广播写入 → 自定义 ref 拿到最终根 DOM。
      const customRef = ref<HTMLElement | null>(null);

      function CustomRender(props: any) {
        // 动态标签走 createElement（<Element /> 过不了 JSX 类型检查）；
        // 字面 Fragment 是 Babel 插件判定组件的 JSX 锚（PD-07 惯用法）。
        return <>{createElement(Element, { ...props, 'data-testid': 'wrapped' })}</>;
      }

      await render(
        cloneVNode(element, {
          render: <CustomRender ref={customRef} />,
          'data-testid': 'wrapped',
          ...(button && { nativeButton }),
        }),
      );

      expect(customRef.value).not.toBe(null);
      expect(customRef.value!.tagName).toBe(Element.toUpperCase());
      expect(customRef.value!).toHaveAttribute('data-testid', 'wrapped');
    });

    it('should merge the rendering element className with the custom component className', async () => {
      // ⚠️ React 契约：组件 className 与 render 元素 className **合并**（两者都在）。
      // 当前 actview 范式（MIGRATION.md 案例 3）是 `{...render.props} {...merged}`
      // **覆盖**——此用例在当前范式下会失败，需组件渲染路径改为合并。
      await render(
        cloneVNode(element, {
          className: 'component-classname',
          render: createElement(Element, { className: 'render-prop-classname' }),
          'data-testid': 'test-component',
          ...(button && { nativeButton }),
        }),
      );

      const component = screen.getByTestId('test-component');
      expect(component.classList.contains('component-classname')).toBe(true);
      expect(component.classList.contains('render-prop-classname')).toBe(true);
    });

    it('should merge the rendering element resolved className with the custom component className', async () => {
      // ⚠️ 同上：className 函数形态解析后仍应与 render 元素 className 合并。
      await render(
        cloneVNode(element, {
          className: () => 'conditional-component-classname',
          render: createElement(Element, { className: 'render-prop-classname' }),
          'data-testid': 'test-component',
          ...(button && { nativeButton }),
        }),
      );

      const component = screen.getByTestId('test-component');
      expect(component.classList.contains('conditional-component-classname')).toBe(true);
      expect(component.classList.contains('render-prop-classname')).toBe(true);
    });
  });
}
