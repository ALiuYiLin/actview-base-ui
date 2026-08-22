import { computed } from 'actview';
import { useMergedRefs } from '@base-ui/actview-utils/useMergedRefs';
import { useButton } from '@/internals/use-button';
import { mergeProps } from '@/merge-props';
import type { HTMLProps } from '@/internals/types';
import type { MenuStore } from '@/menu/store/MenuStore';
import { useMenuItemCommonProps } from '@/menu/item/useMenuItemCommonProps';

export const REGULAR_ITEM = {
  type: 'regular-item' as const,
};

export function useMenuItem(params: UseMenuItemParameters): UseMenuItemReturnValue {
  const {
    closeOnClick,
    disabled,
    highlighted,
    id,
    store,
    typingRef = store.context.typingRef,
    nativeButton,
    itemMetadata,
    nodeId,
  } = params;

  const itemRef = { current: null as HTMLElement | null };

  const resolvedDisabled =
    typeof disabled === 'function' ? computed(disabled as () => boolean) : disabled;

  const { getButtonProps, buttonRef } = useButton({
    disabled: resolvedDisabled,
    focusableWhenDisabled: true,
    native: nativeButton,
    composite: true,
  });

  const getCommonProps = useMenuItemCommonProps({
    closeOnClick,
    highlighted,
    id,
    nodeId,
    store,
    typingRef,
    itemRef,
    itemMetadata,
  });

  const getItemProps = (externalProps?: HTMLProps): HTMLProps => {
    return mergeProps<'div'>(
      getCommonProps(),
      {
        onMouseEnter() {
          if (itemMetadata.type !== 'submenu-trigger') {
            return;
          }

          itemMetadata.setActive();
        },
      },
      externalProps,
      getButtonProps,
    );
  };

  const mergedRef = useMergedRefs(itemRef, buttonRef);

  return {
    getItemProps,
    itemRef: mergedRef,
  };
}

export interface UseMenuItemParameters {
  /**
   * Whether to close the menu when the item is clicked.
   */
  closeOnClick: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean | (() => boolean);
  /**
   * Determines if the menu item is highlighted.
   */
  highlighted: boolean | (() => boolean);
  /**
   * The id of the menu item.
   */
  id: string | undefined;
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * Set to `false` if the rendered element is not a button (for example, `<div>`).
   * @default false
   */
  nativeButton: boolean;
  /**
   * Additional data specific to the item type.
   */
  itemMetadata: UseMenuItemMetadata;
  /**
   * The node id of the menu positioner.
   */
  nodeId: string | undefined | (() => string | undefined);
  /**
   * The menu store.
   */
  store: MenuStore<any>;
  /**
   * Whether a typeahead session is in progress.
   * @default store.context.typingRef
   */
  typingRef?: { current: boolean } | undefined;
}

export type UseMenuItemMetadata =
  | typeof REGULAR_ITEM
  | {
      type: 'submenu-trigger';
      setActive: () => void;
    };

export interface UseMenuItemReturnValue {
  /**
   * Resolver for the root slot's props.
   * @param externalProps event handlers for the root slot
   * @returns props that should be spread on the root slot
   */
  getItemProps: (externalProps?: HTMLProps) => HTMLProps;
  /**
   * The ref to the component's root DOM element.
   */
  itemRef: ((node: HTMLElement | null) => void) | null;
}

export interface UseMenuItemState {}
