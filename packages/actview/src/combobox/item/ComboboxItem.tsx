import { toRefs, unrefs } from 'actview';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** An individual combobox item. Renders a `<div>` element with role option. */
export function ComboboxItem(componentProps: ComboboxItem.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const context = useComboboxRootContext(false);
  const {render, className, style, children, ref, disabled, value, ...elementProps} =
    toRefs(componentProps);

  // useState 必须在 setup 调用（useStore 内部注册 onUnmounted）。
  const selected = context.store.useState('isSelected', value?.value as any);

  const {element} = useRenderElement({
    props: () => [
      {
        role: 'option',
        'aria-selected': selected.value,
        'data-selected': selected.value ? '' : undefined,
        ...unrefs(elementProps),
        onClick: (event: any) => {
          if (disabled?.value ?? false) {
            event.preventDefault();
            return;
          }
          context.store.selectItem(value?.value);
        },
      },
    ],
    className,
    style,
    render,
    refs: () => (componentProps.ref !== undefined ? [ref] : []),
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface ComboboxItemProps {
  /**
   * The value of the item.
   */
  value: any;
  /**
   * Whether the item is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  children?: any;
  [key: string]: any;
}

export namespace ComboboxItem {
  export type Props = ComboboxItemProps;
}
