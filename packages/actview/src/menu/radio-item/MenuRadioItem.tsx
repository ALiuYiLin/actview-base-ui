import { computed } from 'actview';
import { NOOP } from '@base-ui/actview-utils/empty';
import { useMenuRootContext } from '@/menu/root/MenuRootContext';
import { useRenderElement } from '@/internals/useRenderElement';
import { useBaseUiId } from '@/internals/useBaseUiId';
import type { BaseUIComponentProps, HTMLProps, NonNativeButtonProps } from '@/internals/types';
import { useMenuRadioGroupContext } from '@/menu/radio-group/MenuRadioGroupContext';
import { MenuRadioItemContext } from '@/menu/radio-item/MenuRadioItemContext';
import { itemMapping } from '@/menu/utils/stateAttributesMapping';
import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import { REGULAR_ITEM, useMenuItem } from '@/menu/item/useMenuItem';
import { useMenuPositionerContext } from '@/menu/positioner/MenuPositionerContext';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { mergeProps } from '@/merge-props';

/**
 * A menu item that works like a radio button in a given group.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuRadioItem(componentProps: MenuRadioItem.Props) {
  const {
    render: _render,
    className: _className,
    id: idProp,
    label,
    nativeButton = false,
    disabled: disabledProp = false,
    closeOnClick = false,
    value: itemValue,
    style: _style,
    ...elementProps
  } = componentProps;

  const listItem = useCompositeListItem({ guess: true, label });
  const menuPositionerContext = useMenuPositionerContext(true);
  const id = useBaseUiId(idProp);

  const rootContext = useMenuRootContext();
  const store = rootContext.value!.store;
  const highlighted = store.useState('isActive', listItem.index.value);
  const itemProps = store.useState('itemProps');

  const radioGroupContext = useMenuRadioGroupContext();

  const rootDisabled = store.useState('disabled');
  const disabled = computed(
    () => disabledProp || radioGroupContext.value.disabled || rootDisabled.value,
  );
  const checked = computed(() => radioGroupContext.value.value === itemValue);

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

  const state = computed<MenuRadioItemState>(() => ({
    disabled: disabled.value,
    highlighted: highlighted.value,
    checked: checked.value,
  }));

  function handleClick(event: MouseEvent) {
    const details = createChangeEventDetails(REASONS.itemPress, event, undefined, {
      preventUnmountOnClose: NOOP,
    });

    radioGroupContext.value.setValue(itemValue, details);
  }

  const getElement = useRenderElement('div', componentProps, {
    state,
    stateAttributesMapping: itemMapping,
    props: [
      (prev: any) => mergeProps(prev, itemProps.value) as HTMLProps,
      // Merge so `handleClick` chains with `itemProps`'s own `onClick` (list navigation) instead
      // of replacing it (AD-20/AD-27).
      (prev: any) =>
        mergeProps(prev, {
          role: 'menuitemradio',
          'aria-checked': checked.value ? 'true' : 'false',
          onClick: handleClick,
        }) as HTMLProps,
      (prev: any) => mergeProps(prev, elementProps) as HTMLProps,
      getItemProps,
    ],
    ref: [itemRef, componentProps.ref, listItem.ref],
  });

  const contextValue = computed<MenuRadioItemContext>(() => ({
    checked: checked.value,
    highlighted: highlighted.value,
    disabled: disabled.value,
  }));

  return (
    <MenuRadioItemContext.Provider value={contextValue}>
      {getElement()}
    </MenuRadioItemContext.Provider>
  );
}

export interface MenuRadioItemState {
  /**
   * Whether the radio item should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the radio item is currently highlighted.
   */
  highlighted: boolean;
  /**
   * Whether the radio item is currently selected.
   */
  checked: boolean;
}

export interface MenuRadioItemProps
  extends NonNativeButtonProps, BaseUIComponentProps<'div', MenuRadioItemState> {
  /**
   * Value of the radio item.
   * This is the value that will be set in the MenuRadioGroup when the item is selected.
   */
  value: any;
  /**
   * The click handler for the menu item.
   */
  onClick?: BaseUIComponentProps<'div', MenuRadioItemState>['onClick'] | undefined;
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
   * @default false
   */
  closeOnClick?: boolean | undefined;
}

export namespace MenuRadioItem {
  export type State = MenuRadioItemState;
  export type Props = MenuRadioItemProps;
}
