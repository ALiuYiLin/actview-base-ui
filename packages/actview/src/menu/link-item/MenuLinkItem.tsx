import { computed } from 'actview';
import { useMenuRootContext } from '@/menu/root/MenuRootContext';
import { useRenderElement } from '@/internals/useRenderElement';
import { useBaseUiId } from '@/internals/useBaseUiId';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import { useMenuPositionerContext } from '@/menu/positioner/MenuPositionerContext';
import { useMenuItemCommonProps } from '@/menu/item/useMenuItemCommonProps';
import { REGULAR_ITEM } from '@/menu/item/useMenuItem';
import { useButton } from '@/internals/use-button';
import { mergeProps } from '@/merge-props';

/**
 * A link in the menu that can be used to navigate to a different page or section.
 * Renders an `<a>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuLinkItem(componentProps: MenuLinkItem.Props) {
  const {
    render: _render,
    className: _className,
    id: idProp,
    label,
    closeOnClick = false,
    style: _style,
    ...elementProps
  } = componentProps;

  const linkRef = { current: null as HTMLAnchorElement | null };

  const listItem = useCompositeListItem({ guess: true, label });
  const menuPositionerContext = useMenuPositionerContext(true);
  const nodeId = () => menuPositionerContext.value?.context.nodeId;

  const id = useBaseUiId(idProp);

  const rootContext = useMenuRootContext();
  const store = rootContext.value!.store;
  const highlighted = store.useState('isActive', listItem.index.value);
  const itemProps = store.useState('itemProps');
  const typingRef = store.context.typingRef;

  const { getButtonProps, buttonRef } = useButton({
    native: false,
    composite: true,
  });

  const getCommonProps = useMenuItemCommonProps({
    closeOnClick,
    highlighted: () => highlighted.value,
    id,
    nodeId,
    store,
    typingRef,
    itemRef: linkRef,
    itemMetadata: REGULAR_ITEM,
  });

  const getItemProps = (externalProps?: HTMLProps): HTMLProps => {
    return mergeProps<'a'>(getCommonProps(), externalProps, getButtonProps);
  };

  const state = computed<MenuLinkItemState>(() => ({ highlighted: highlighted.value }));

  const getElement = useRenderElement('a', componentProps, {
    state,
    props: [
      (prev: any) => mergeProps(prev, itemProps.value) as HTMLProps,
      (prev: any) => mergeProps(prev, elementProps) as HTMLProps,
      getItemProps,
    ],
    ref: [linkRef, buttonRef, componentProps.ref, listItem.ref],
  });

  return <>{getElement()}</>;
}

export interface MenuLinkItemState {
  /**
   * Whether the item is highlighted.
   */
  highlighted: boolean;
}

export interface MenuLinkItemProps extends BaseUIComponentProps<
  'a',
  MenuLinkItemState,
  JSX.IntrinsicElements['a']
> {
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

export namespace MenuLinkItem {
  export type State = MenuLinkItemState;
  export type Props = MenuLinkItemProps;
}
