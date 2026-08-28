import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/** A list of combobox items. Renders a `<div>` element with role listbox. */
export function ComboboxList(componentProps: ComboboxList.Props) {
  // ============ setup（只执行一次）：值形 props toRefs 活引用 ============
  // children 为 render-prop（函数形式）→ 渲染期求值后注入 rootProps。
  const context = useComboboxRootContext(false);
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;
  const items = computed(() => context.itemsRef.value);

  const listRef = (el: any) => {
    context.store.setListElement(el ?? null);
  };

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) {
      if (k === 'children') continue;
      out[k] = elementRefs[k].value;
    }
    return out;
  });

  // children 兼容 render prop（渲染期求值）。
  const childrenOverride = computed(() => {
    const raw = elementRefs.children?.value;
    return typeof raw === 'function' ? raw({items: items.value}) : raw;
  });

  // 根元素 props：listbox 语义 + children 注入 → 透传。
  const rootProps = computed<Record<string, any>>(() => ({
    role: 'listbox',
    ...elementProps.value,
    children: childrenOverride.value,
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
          ref: useMergedRefs(listRef, componentProps.ref as any),
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface ComboboxListProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxList {
  export type Props = ComboboxListProps;
}
