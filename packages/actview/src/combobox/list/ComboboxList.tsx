import { toRefs, unrefs, computed } from 'actview';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** A list of combobox items. Renders a `<div>` element with role listbox. */
export function ComboboxList(props: ComboboxList.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const context = useComboboxRootContext(false);
  const {render, className, style, children, ref, ...elementProps} = toRefs(props);
  const items = computed(() => context.itemsRef.value);

  const listRef = (el: any) => {
    context.store.setListElement(el ?? null);
  };

  const {element} = useRenderElement({
    props: () => [{'role': 'listbox'}, unrefs(elementProps)],
    className,
    style,
    render,
    refs: () => (props.ref !== undefined ? [listRef, ref] : [listRef]),
    children: () => {
      const raw = children?.value;
      return typeof raw === 'function' ? raw({items: items.value}) : raw;
    },
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface ComboboxListProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxList {
  export type Props = ComboboxListProps;
}
