import {toRefs, unrefs, toValue} from 'actview';
import { REGULAR_ITEM, useMenuItem } from './useMenuItem';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useBaseUiId } from '@/internals/useBaseUiId';
import type { BaseUIComponentProps, NonNativeButtonProps } from '@/internals/types';
import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * An individual interactive item in the menu.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuItem(componentProps: MenuItem.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {
    id: idProp,
    label,
    nativeButton = false,
    disabled: disabledProp = false,
    closeOnClick = true,
  } = componentProps;

  const {render, className, style, children, ref, ...elementProps} = toRefs(componentProps);

  const listItem = useCompositeListItem({guess: true, label});
  const menuPositionerContext = useMenuPositionerContext(true);
  const id = useBaseUiId(idProp);

  const {store} = useMenuRootContext();
  const rootDisabled = store.useState('disabled');
  const disabled = disabledProp || rootDisabled.value;
  const activeIndex = store.useState('activeIndex');
  const itemProps = store.useState('itemProps');

  const {getItemProps, itemRef} = useMenuItem({
    closeOnClick,
    disabled,
    highlighted: false, // 由 render 期按 activeIndex 计算
    id,
    store,
    nativeButton,
    nodeId: menuPositionerContext?.value?.nodeId,
    itemMetadata: REGULAR_ITEM,
  });

  const {element} = useRenderElement({
    props: () => {
      const merged: any = {};
      for (const prop of [itemProps.value, unrefs(elementProps), getItemProps as any]) {
        const resolved = typeof (prop as any) === 'function' ? (prop as any)(merged) : prop;
        Object.assign(merged, resolved);
      }

      // `data-highlighted` / `data-disabled` state attributes
      const highlighted = activeIndex.value === toValue(listItem.index);
      if (highlighted) {
        merged['data-highlighted'] = '';
      }
      if (disabled) {
        merged['data-disabled'] = '';
      }
      return [merged];
    },
    state: (): MenuItemState => ({
      disabled,
      highlighted: activeIndex.value === toValue(listItem.index),
    }),
    className,
    style,
    render,
    refs: () => {
      const refs: any[] = [
        (el: HTMLElement | null) => {
          itemRef?.(el);
          listItem.ref(el);
        },
      ];
      if (componentProps.ref !== undefined) {
        refs.push(ref);
      }
      return refs;
    },
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface MenuItemState {
  /**
   * Whether the item should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the item is highlighted.
   */
  highlighted: boolean;
}

export interface MenuItemProps
  extends NonNativeButtonProps, BaseUIComponentProps<'div', MenuItemState> {
  /**
   * The click handler for the menu item.
   */
  onClick?: BaseUIComponentProps<'div', MenuItemState>['onClick'] | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Overrides the text label to use when the item is matched during keyboard text navigation.
   */
  label?: string | undefined;
  /**
   * @ignore
   */
  id?: string | undefined;
  /**
   * Whether to close the menu when the item is clicked.
   *
   * @default true
   */
  closeOnClick?: boolean | undefined;
}

export namespace MenuItem {
  export type State = MenuItemState;
  export type Props = MenuItemProps;
}
