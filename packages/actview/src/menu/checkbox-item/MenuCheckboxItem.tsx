import { computed } from 'actview';
import { NOOP } from '@base-ui/actview-utils/empty';
import { useControlled } from '@base-ui/actview-utils/useControlled';
import { MenuCheckboxItemContext } from '@/menu/checkbox-item/MenuCheckboxItemContext';
import { REGULAR_ITEM, useMenuItem } from '@/menu/item/useMenuItem';
import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import { useMenuRootContext } from '@/menu/root/MenuRootContext';
import { useRenderElement } from '@/internals/useRenderElement';
import { useBaseUiId } from '@/internals/useBaseUiId';
import type { BaseUIComponentProps, HTMLProps, NonNativeButtonProps } from '@/internals/types';
import { itemMapping } from '@/menu/utils/stateAttributesMapping';
import { useMenuPositionerContext } from '@/menu/positioner/MenuPositionerContext';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import type { MenuRoot } from '@/menu/root/MenuRoot';
import { mergeProps } from '@/merge-props';

/**
 * A menu item that toggles a setting on or off.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuCheckboxItem(componentProps: MenuCheckboxItem.Props) {
  const {
    render: _render,
    className: _className,
    id: idProp,
    label,
    nativeButton = false,
    disabled: disabledProp = false,
    closeOnClick = false,
    checked: checkedProp,
    defaultChecked,
    onCheckedChange: _onCheckedChange,
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

  const checked = useControlled({
    controlled: computed(() => componentProps.checked),
    default: computed(() => defaultChecked ?? false),
    name: 'MenuCheckboxItem',
    state: 'checked',
  });

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

  const state = computed<MenuCheckboxItemState>(() => ({
    disabled: disabled.value,
    highlighted: highlighted.value,
    checked: checked.value ?? false,
  }));

  function handleClick(event: MouseEvent) {
    const details = createChangeEventDetails(REASONS.itemPress, event, undefined, {
      preventUnmountOnClose: NOOP,
    });

    componentProps.onCheckedChange?.(
      !(checked.value ?? false),
      details as MenuCheckboxItem.ChangeEventDetails,
    );

    if (details.isCanceled) {
      return;
    }

    checked.setValueIfUncontrolled(!(checked.value ?? false));
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
          role: 'menuitemcheckbox',
          'aria-checked': checked.value ? 'true' : 'false',
          onClick: handleClick,
        }) as HTMLProps,
      (prev: any) => mergeProps(prev, elementProps) as HTMLProps,
      getItemProps,
    ],
    ref: [itemRef, componentProps.ref, listItem.ref],
  });

  const contextValue = computed<MenuCheckboxItemContext>(() => ({
    checked: checked.value ?? false,
    highlighted: highlighted.value,
    disabled: disabled.value,
  }));

  return (
    <MenuCheckboxItemContext.Provider value={contextValue}>
      {getElement()}
    </MenuCheckboxItemContext.Provider>
  );
}

export interface MenuCheckboxItemState {
  /**
   * Whether the checkbox item should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the checkbox item is currently highlighted.
   */
  highlighted: boolean;
  /**
   * Whether the checkbox item is currently ticked.
   */
  checked: boolean;
}

export interface MenuCheckboxItemProps
  extends NonNativeButtonProps, BaseUIComponentProps<'div', MenuCheckboxItemState> {
  /**
   * Whether the checkbox item is currently ticked.
   *
   * To render an uncontrolled checkbox item, use the `defaultChecked` prop instead.
   */
  checked?: boolean | undefined;
  /**
   * Whether the checkbox item is initially ticked.
   *
   * To render a controlled checkbox item, use the `checked` prop instead.
   * @default false
   */
  defaultChecked?: boolean | undefined;
  /**
   * Event handler called when the checkbox item is ticked or unticked.
   */
  onCheckedChange?:
    | ((checked: boolean, eventDetails: MenuCheckboxItem.ChangeEventDetails) => void)
    | undefined;
  /**
   * The click handler for the menu item.
   */
  onClick?: BaseUIComponentProps<'div', MenuCheckboxItemState>['onClick'] | undefined;
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

export type MenuCheckboxItemChangeEventReason = MenuRoot.ChangeEventReason;
export type MenuCheckboxItemChangeEventDetails = MenuRoot.ChangeEventDetails;

export namespace MenuCheckboxItem {
  export type State = MenuCheckboxItemState;
  export type Props = MenuCheckboxItemProps;
  export type ChangeEventReason = MenuCheckboxItemChangeEventReason;
  export type ChangeEventDetails = MenuCheckboxItemChangeEventDetails;
}
