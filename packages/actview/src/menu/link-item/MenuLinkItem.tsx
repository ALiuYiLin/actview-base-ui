import {computed, toRefs, unrefs, ref, toValue} from 'actview';
import { mergeProps, mergePropsN } from '@/merge-props';
import type { HTMLProps } from '@/internals/types';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { useMenuItemCommonProps } from '../item/useMenuItemCommonProps';
import { REGULAR_ITEM } from '../item/useMenuItem';
import { useButton } from '@/internals/use-button/useButton';
import type { Ref } from 'actview';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * A link in the menu that can be used to navigate to a different page or section.
 * Renders an `<a>` element.
 */
export function MenuLinkItem(componentProps: MenuLinkItem.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {id: idProp, label, closeOnClick = false} = componentProps as any;
  const {render, className, style, children, ref: refProp, ...elementProps} = toRefs(componentProps);

  const linkRef = ref(null as HTMLAnchorElement | null);

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
    typingRef: typingRef as unknown as Ref<boolean>,
    itemRef: linkRef as any,
    itemMetadata: REGULAR_ITEM,
  });

  const getItemProps = (externalProps?: HTMLProps): HTMLProps => {
    return mergeProps(commonProps, externalProps, getButtonProps);
  };

  const {element} = useRenderElement({
    props: () => {
      const merged: any = mergePropsN<any>([
        itemProps.value,
        unrefs(elementProps),
        getItemProps as any,
      ]);
      if (highlighted.value) {
        merged['data-highlighted'] = '';
      }
      return [merged];
    },
    state: (): MenuLinkItemState => ({
      highlighted: highlighted.value,
    }),
    className,
    style,
    render,
    refs: () => {
      const refs: any[] = [
        (el: HTMLAnchorElement | null) => {
          linkRef.value = el;
          buttonRef(el);
          listItem.ref(el);
        },
      ];
      if (componentProps.ref !== undefined) {
        refs.push(refProp);
      }
      return refs;
    },
    children,
    defaultTag: 'a',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

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
