import { computed, defineComponent, toValue } from 'actview';
import { mergeProps, mergePropsN } from '@/merge-props';
import type { HTMLProps } from '@/internals/types';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { useMenuItemCommonProps } from '../item/useMenuItemCommonProps';
import { REGULAR_ITEM } from '../item/useMenuItem';
import { useButton } from '@/internals/use-button/useButton';

/**
 * A link in the menu that can be used to navigate to a different page or section.
 * Renders an `<a>` element.
 */
export const MenuLinkItem = defineComponent(function MenuLinkItem(
  componentProps: MenuLinkItem.Props,
) {
  const {id: idProp, label, closeOnClick = false} = componentProps as any;
  const children = toValue(componentProps.children);

  const linkRef = {current: null as HTMLAnchorElement | null};

  const listItem = useCompositeListItem({guess: true, label});
  const menuPositionerContext = useMenuPositionerContext(true);
  const nodeId = menuPositionerContext?.value?.nodeId;

  const id = useBaseUiId(idProp);

  const {store} = useMenuRootContext();
  const highlighted = computed(() => store.select('isActive', toValue(listItem.index)));
  const itemProps = store.useState('itemProps');
  const typingRef = store.context.typingRef;

  const {getButtonProps, buttonRef} = useButton({
    disabled: false,
    native: false,
    composite: true,
  });

  const commonProps = useMenuItemCommonProps({
    closeOnClick,
    highlighted: false,
    id,
    nodeId,
    store,
    typingRef: typingRef as unknown as {current: boolean},
    itemRef: linkRef as any,
    itemMetadata: REGULAR_ITEM,
  });

  const getItemProps = (externalProps?: HTMLProps): HTMLProps => {
    return mergeProps(commonProps, externalProps, getButtonProps);
  };

  return () => {
    const {render, className: cls, style: st, ...elementProps} = componentProps as any;

    const state: MenuLinkItemState = {
      highlighted: highlighted.value,
    };

    const merged: any = mergePropsN<any>([
      itemProps.value,
      elementProps,
      getItemProps as any,
    ]);

    if (state.highlighted) {
      merged['data-highlighted'] = '';
    }

    const mergedRefs = (el: HTMLAnchorElement | null) => {
      linkRef.current = el;
      buttonRef(el);
      listItem.ref(el);
      if (typeof componentProps.ref === 'function') {
        (componentProps.ref as any)(el);
      } else if (componentProps.ref) {
        componentProps.ref.value = el;
        componentProps.ref.current = el;
      }
    };

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...state, ref: mergedRefs} as any);
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof merged.className === 'string' && typeof renderClassName === 'string'
          ? `${merged.className} ${renderClassName}`.trim()
          : (merged.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={mergedRefs}>{children}</Tag>;
    }
    return <a {...merged} ref={mergedRefs}>{children}</a>;
  };
});

export interface MenuLinkItemState {
  /**
   * Whether the item is highlighted.
   */
  highlighted: boolean;
}

export interface MenuLinkItemProps {
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
  [key: string]: any;
}

export namespace MenuLinkItem {
  export type State = MenuLinkItemState;
  export type Props = MenuLinkItemProps;
}
