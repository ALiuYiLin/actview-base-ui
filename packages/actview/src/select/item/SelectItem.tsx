import { toRefs, unrefs, computed } from 'actview';
import { useSelectRootContext } from '../root/SelectRootContext';
import { SelectItemContext } from './SelectItemContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** An individual select item. Renders a `<div>` element with role option. */
export function SelectItem(componentProps: SelectItem.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const store = useSelectRootContext(false);
  const {render, className, style, children, ref: refProp, disabled, value, ...elementProps} =
    toRefs(componentProps);

  const selectedState = store.useState('isSelected', value?.value as any);
  const selected = computed(() => selectedState.value ?? false);

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
          store.selectValue(value?.value);
        },
      },
    ],
    className,
    style,
    render,
    refs: () => (componentProps.ref !== undefined ? [refProp as any] : []),
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <SelectItemContext.Provider
      value={
        {
          selected: selected.value,
          value: value?.value,
        } as any
      }
    >
      {element()}
    </SelectItemContext.Provider>
  );
}

export interface SelectItemProps {
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

export namespace SelectItem {
  export type Props = SelectItemProps;
}
