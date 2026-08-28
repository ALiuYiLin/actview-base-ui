import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import { useRenderElement } from '@/internals/useRenderElement';

/** A row for the item value. Renders a `<div>` element. */
export function ComboboxRow(props: ComboboxRow.Props) {
  // ============ setup（只执行一次）：值形 props toRefs 活引用 ============
  // children 不解构、随 elementRefs 流入渲染元素。
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
      {useRenderElement(
        'div',
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

export interface ComboboxRowProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxRow {
  export type Props = ComboboxRowProps;
}
