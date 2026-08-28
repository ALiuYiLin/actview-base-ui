import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import { useSelectRootContext } from '../root/SelectRootContext';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/** A list of select items. Renders a `<div>` element with role listbox. */
export function SelectList(props: SelectList.Props) {
  // ============ setup（只执行一次）：值形 props toRefs 活引用 ============
  // children 不解构、随 elementRefs 流入渲染元素。
  const store = useSelectRootContext(false);
  const { className, render, style, ...elementRefs } = toRefs(props) as Record<
    string,
    Ref<any>
  >;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  // 根元素 props：listbox 语义 → 透传。
  const rootProps = computed<Record<string, any>>(() => ({
    role: 'listbox',
    ...elementProps.value,
  }));

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
          ref: useMergedRefs(
            (el: any) => {
              store.setListElement(el ?? null);
            },
            props.ref as any,
          ),
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface SelectListProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectList {
  export type Props = SelectListProps;
}
