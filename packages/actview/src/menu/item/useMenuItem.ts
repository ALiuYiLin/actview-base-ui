import { useButton } from '@/internals/use-button/useButton';
import { mergeProps } from '@/merge-props';
import type { HTMLProps } from '@/internals/types';
import type { MenuStore } from '../store/MenuStore';
import { useMenuItemCommonProps } from './useMenuItemCommonProps';
import {ref} from 'actview';
import type { Ref } from 'actview';

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

  const itemRef = ref(null as HTMLElement | null);

  const {getButtonProps, buttonRef} = useButton({
    disabled,
    focusableWhenDisabled: true,
    native: nativeButton,
    composite: true,
  });

  const commonProps = useMenuItemCommonProps({
    closeOnClick,
    highlighted,
    id,
    nodeId,
    store,
    typingRef: typingRef as Ref<boolean>,
    itemRef,
    itemMetadata,
  });

  const getItemProps = (externalProps?: HTMLProps): HTMLProps => {
    return mergeProps(
      commonProps,
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

  const mergedRef = (el: HTMLElement | null) => {
    itemRef.value = el;
    buttonRef(el);
  };

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
  disabled: boolean;
  /**
   * Determines if the menu item is highlighted.
   */
  highlighted: boolean;
  /**
   * The id of the menu item.
   */
  id: string | undefined;
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
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
  nodeId: string | undefined;
  /**
   * The menu store.
   */
  store: MenuStore<any>;
  /**
   * Whether a typeahead session is in progress.
   * @default store.context.typingRef
   */
  typingRef?: Ref<boolean> | undefined;
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
  itemRef: ((el: HTMLElement | null) => void) | null;
}

export interface UseMenuItemState {}
