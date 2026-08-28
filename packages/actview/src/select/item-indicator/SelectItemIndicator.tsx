import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import { useSelectItemContext } from '../item/SelectItemContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** Shows a checkmark when the item is selected. Renders a `<span>` element. */
export function SelectItemIndicator(props: SelectItemIndicator.Props) {
  // ============ setup（只执行一次）：值形 props toRefs 活引用 ============
  // children 不解构、随 elementRefs 流入渲染元素。
  const context = useSelectItemContext(false);
  const { className, render, style, ...elementRefs } = toRefs(props) as Record<string, Ref<any>>;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {!context.selected
        ? null
        : useRenderElement(
            'span',
            {
              className: className?.value,
              render: render?.value,
              style: style?.value,
            },
            {
              props: [elementProps.value],
            },
          )}
    </>
  );
}

export interface SelectItemIndicatorProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectItemIndicator {
  export type Props = SelectItemIndicatorProps;
}
