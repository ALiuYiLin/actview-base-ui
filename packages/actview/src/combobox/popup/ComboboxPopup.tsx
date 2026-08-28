import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** The popup of the combobox. Renders a `<div>` element when open. */
export function ComboboxPopup(componentProps: ComboboxPopup.Props) {
  // ============ setup（只执行一次）：值形 props toRefs 活引用 ============
  // children 不解构、随 elementRefs 流入渲染元素。
  const context = useComboboxRootContext(false);
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;
  // useState 必须在 setup 调用（useStore 内部注册 onUnmounted）。
  const open = context.store.useState('open');
  const mounted = context.store.useState('mounted');

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
          enabled: open.value || mounted.value,
          ref: componentProps.ref as any,
          props: [elementProps.value],
        },
      )}
    </>
  );
}

export interface ComboboxPopupProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxPopup {
  export type Props = ComboboxPopupProps;
}
