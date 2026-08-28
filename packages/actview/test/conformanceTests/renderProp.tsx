import { ref } from 'actview';
import type { Ref } from 'actview';
import { expect } from 'vitest';
import type { VNode } from '@actview/jsx';
import { randomStringValue, screen } from '../test-utils';
import type { BaseUiConformanceTestsOptions } from '../describeConformance';
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

  // 组件函数形式：不用 cloneVNode 改写 VNode、不用 createElement 渲染动态
  // 标签——动态原生标签用内置 `<component is>`；目标组件经 Host 组件函数
  // 合并 props（element.type + element.props + extra）。
  const Target = element.type as any;

  // 返回真实 VNode（<Host />）——family render 包装器的契约是
  // render(node.type, {...node.props})（root 型）或作为 children 注入
  // Provider（parts 型），两种形态都要求真 vnode。
  function renderElementWith(extraProps: Record<string, any>) {
    function Host() {
      return <Target {...(element.props ?? {})} {...extraProps} />;
    }
    return <Host />;
  }

  // actview 无 forwardRef：Wrapper 把 props 原样透传到自定义根元素上
  // （`<component is>` 承担动态原生标签）。ref 合并语义由组件传入的
  // props.ref 承担。
  function Wrapper(props: any) {
    const inner = <component is={Element} {...props} data-testid="wrapped" />;
    return wrappingAllowed ? <div data-testid="base-ui-wrapper">{inner}</div> : inner;
  }

  describe('prop: render', () => {
    it('renders a customized root element with a function', async () => {
      const testValue = randomStringValue();

      await render(
        renderElementWith({
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
        renderElementWith({
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
        renderElementWith({
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
      // 且经 <component is> 透传到自定义根元素后指向其根 DOM。
      let refFromRenderProp: Ref<HTMLElement | null> | null = null;

      await render(
        renderElementWith({
          render: (props: any) => {
            refFromRenderProp = props.ref;
            return <component is={Element} {...props} data-testid="wrapped" />;
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
      // hook 经 getReactElementRef 把它并入合并链；组件函数内经
      // <component is> 把 props（含合并链 ref）透传到根元素，合并链广播
      // 写入 → 自定义 ref 拿到最终根 DOM。
      const customRef = ref<HTMLElement | null>(null);

      function CustomRender(props: any) {
        return <component is={Element} {...props} data-testid="wrapped" />;
      }

      await render(
        renderElementWith({
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
        renderElementWith({
          className: 'component-classname',
          render: <component is={Element} className="render-prop-classname" />,
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
        renderElementWith({
          className: () => 'conditional-component-classname',
          render: <component is={Element} className="render-prop-classname" />,
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
