import { computed, defineComponent, ref } from 'actview';
import { useMergedRefs } from '@base-ui/actview-utils/useMergedRefs';
import { REGULAR_ITEM, useMenuItem } from '@/menu/item/useMenuItem';
import { useMenuRootContext } from '@/menu/root/MenuRootContext';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import type { BaseUIComponentProps, HTMLProps, NonNativeButtonProps } from '@/internals/types';
import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import { useMenuPositionerContext } from '@/menu/positioner/MenuPositionerContext';
import { mergePropsN } from '@/merge-props';

/**
 * An individual interactive item in the menu.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export const MenuItem = defineComponent(function (componentProps: MenuItem.Props) {
  // ================= setup（只执行一次） =================
  const listItem = useCompositeListItem({ guess: true, label: componentProps.label });
  const menuPositionerContext = useMenuPositionerContext(true);
  const id = useBaseUiId(componentProps.id);

  const rootContext = useMenuRootContext();
  const store = rootContext.value!.store;
  const rootDisabled = store.useState('disabled');
  const disabled = computed(() => (componentProps.disabled ?? false) || rootDisabled.value);
  const highlighted = store.useState('isActive', listItem.index.value);
  const itemProps = store.useState('itemProps');

  const nodeId = () => menuPositionerContext.value?.context.nodeId;

  const { getItemProps, itemRef } = useMenuItem({
    closeOnClick: componentProps.closeOnClick ?? true,
    disabled: () => disabled.value,
    highlighted: () => highlighted.value,
    id,
    store,
    nativeButton: componentProps.nativeButton ?? false,
    nodeId,
    itemMetadata: REGULAR_ITEM,
  });

  const state = computed<MenuItemState>(() => ({
    disabled: disabled.value,
    highlighted: highlighted.value,
  }));

  const rootRef = ref<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(itemRef, componentProps.ref, listItem.ref, rootRef);

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      id: _id,
      label: _label,
      nativeButton: _nativeButton,
      disabled: _disabled,
      closeOnClick: _closeOnClick,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const stateValue = state.value;
    const currentItemProps = itemProps.value;

    const stateAttributes = getStateAttributesProps(stateValue);

    // `itemProps` carries store-reactive values, so read it in render (setup would snapshot it).
    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      currentItemProps,
      {
        className: typeof className === 'function' ? className(stateValue) : className,
        style: typeof style === 'function' ? style(stateValue) : style,
      },
      (p: HTMLProps) => getItemProps(p),
    ]);

    // render 三形态
    if (typeof render === 'function') {
      return render({ ...merged, ...stateValue, ref: mergedRef });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={mergedRef} />;
    }
    return <div ref={mergedRef} {...merged} />;
  };
}) as (props: MenuItem.Props) => any;

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