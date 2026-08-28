import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps, Orientation } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * A separator element accessible to screen readers.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Separator](https://base-ui.com/react/components/separator)
 */
export function Separator(componentProps: Separator.Props) {
  // ============ setup：值形 props toRefs 活引用；ref 形 props 直读本體 ============
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 整次 useRenderElement 调用逐渲染求值（props 直读响应式，无 toValue）；
  // state 走默认 data-{key} 映射（data-orientation）；children 留在
  // elementProps 里随 props 流入渲染元素。
  return (
    <>
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: { orientation: componentProps.orientation ?? 'horizontal' },
          ref: componentProps.ref,
          props: [
            { role: 'separator', 'aria-orientation': componentProps.orientation ?? 'horizontal' },
            elementProps.value,
          ],
        },
      )}
    </>
  );
}

export interface SeparatorProps extends BaseUIComponentProps<'div', SeparatorState> {
  /**
   * The orientation of the separator.
   * @default 'horizontal'
   */
  orientation?: Orientation | undefined;
}

export interface SeparatorState {
  /**
   * The orientation of the separator.
   */
  orientation: Orientation;
}

export namespace Separator {
  export type Props = SeparatorProps;
  export type State = SeparatorState;
}
