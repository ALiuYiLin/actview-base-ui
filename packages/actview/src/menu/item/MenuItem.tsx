import {defineComponent, toValue, ref} from 'actview';
import { REGULAR_ITEM, useMenuItem } from './useMenuItem';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useBaseUiId } from '@/internals/useBaseUiId';
import type { BaseUIComponentProps, NonNativeButtonProps } from '@/internals/types';
import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';

/**
 * An individual interactive item in the menu.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export const MenuItem = defineComponent(function MenuItem(componentProps: MenuItem.Props) {
  const {
    render,
    className,
    id: idProp,
    label,
    nativeButton = false,
    disabled: disabledProp = false,
    closeOnClick = true,
    style,
  } = componentProps;

  const children = toValue(componentProps.children);

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

  const state: MenuItemState = {
    disabled,
    highlighted: false,
  };

  return () => {
    const {className: cls, style: st, render: r, ...elementProps} = componentProps;

    const highlighted = activeIndex.value === toValue(listItem.index);
    state.disabled = disabled;
    state.highlighted = highlighted;

    const merged: any = {};
    for (const prop of [itemProps.value, elementProps, getItemProps as any]) {
      const resolved = typeof (prop as any) === 'function' ? (prop as any)(merged) : prop;
      Object.assign(merged, resolved);
    }

    // `data-highlighted` / `data-disabled` state attributes
    if (highlighted) {
      merged['data-highlighted'] = '';
    }
    if (disabled) {
      merged['data-disabled'] = '';
    }

    const mergedRefs = (el: HTMLElement | null) => {
      itemRef?.(el);
      listItem.ref(el);
    };

    if (r) {
      if (typeof r === 'function') {
        return r({...merged, ...state, ref: mergedRefs} as any);
      }
      const renderProps = r.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = r.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof merged.className === 'string' && typeof renderClassName === 'string'
          ? `${merged.className} ${renderClassName}`.trim()
          : (merged.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={r.key} {...mergedRenderProps} ref={mergedRefs}>{children}</Tag>;
    }
    return <div {...merged} ref={mergedRefs}>{children}</div>;
  };
});

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
