import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import { useSelectRootContext } from '../root/SelectRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** The popup of the select. Renders a `<div>` element when open. */
export function SelectPopup(props: SelectPopup.Props) {
  // ============ setup（只执行一次）：值形 props toRefs 活引用 ============
  // children 不解构、随 elementRefs 流入渲染元素。
  const store = useSelectRootContext(false);
  const { className, render, style, ...elementRefs } = toRefs(props) as Record<
    string,
    Ref<any>
  >;
  const openState = store.useState('open');
  const mountedState = store.useState('mounted');
  const open = computed(() => openState.value);
  const mounted = computed(() => mountedState.value);

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {!open.value && !mounted.value
        ? null
        : useRenderElement(
            'div',
            {
              className: className?.value,
              render: render?.value,
              style: style?.value,
            },
            {
              ref: props.ref as any,
              props: [elementProps.value],
            },
          )}
    </>
  );
}

export interface SelectPopupProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectPopup {
  export type Props = SelectPopupProps;
}
