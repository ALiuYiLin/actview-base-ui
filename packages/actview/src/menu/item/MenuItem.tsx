import { computed } from 'actview';
import { REGULAR_ITEM, useMenuItem } from './useMenuItem';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useRenderElement } from '../../internals/useRenderElement';
import { useBaseUiId } from '../../internals/useBaseUiId';
import type { BaseUIComponentProps, HTMLProps, NonNativeButtonProps } from '../../internals/types';
import { useCompositeListItem } from '../../internals/composite/list/useCompositeListItem';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { mergeProps } from '../../merge-props';

/**
 * An individual interactive item in the menu.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuItem(componentProps: MenuItem.Props) {
  const {
    render: _render,
    className: _className,
    id: idProp,
    label,
    nativeButton = false,
    disabled: disabledProp = false,
    closeOnClick = true,
    style: _style,
    ...elementProps
  } = componentProps;

  const listItem = useCompositeListItem({ guess: true, label });
  const menuPositionerContext = useMenuPositionerContext(true);
  const id = useBaseUiId(idProp);

  const rootContext = useMenuRootContext();
  const store = rootContext.value!.store;
  const rootDisabled = store.useState('disabled');
  const disabled = computed(() => disabledProp || rootDisabled.value);
  const highlighted = store.useState('isActive', listItem.index.value);
  const itemProps = store.useState('itemProps');

  const nodeId = () => menuPositionerContext.value?.context.nodeId;

  const { getItemProps, itemRef } = useMenuItem({
    closeOnClick,
    disabled: () => disabled.value,
    highlighted: () => highlighted.value,
    id,
    store,
    nativeButton,
    nodeId,
    itemMetadata: REGULAR_ITEM,
  });

  const state = computed<MenuItemState>(() => ({
    disabled: disabled.value,
    highlighted: highlighted.value,
  }));

  const getElement = useRenderElement('div', componentProps, {
    state,
    props: [
      // `itemProps` carries store-reactive values, so merge it inside a getter (setup would
      // snapshot it — AD-36). Merge (not spread) so `on*` handlers chain (AD-20/AD-27).
      (prev: any) => mergeProps(prev, itemProps.value) as HTMLProps,
      (prev: any) => mergeProps(prev, elementProps) as HTMLProps,
      getItemProps,
    ],
    ref: [itemRef, componentProps.ref, listItem.ref],
  });

  return <>{getElement()}</>;
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
