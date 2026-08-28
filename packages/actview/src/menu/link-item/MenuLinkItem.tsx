import {computed, ref, toRefs} from 'actview';
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
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * A link in the menu that can be used to navigate to a different page or section.
 * Renders an `<a>` element.
 */
export function MenuLinkItem(componentProps: MenuLinkItem.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const linkRef = ref(null as HTMLAnchorElement | null);

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  const listItem = useCompositeListItem({guess: true, label: componentProps.label});
  const menuPositionerContext = useMenuPositionerContext(true);
  const nodeId = menuPositionerContext?.nodeId;

  const id = useBaseUiId(componentProps.id);

  const {store} = useMenuRootContext();
  const highlighted = computed(() => store.select('isActive', listItem.index.value));
  const itemProps = store.useState('itemProps');
  const typingRef = store.context.typingRef;

  const {getButtonProps, buttonRef} = useButton({
    disabled: false,
    native: false,
    composite: true,
  });

  const commonProps = useMenuItemCommonProps({
    closeOnClick: componentProps.closeOnClick ?? false,
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

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<MenuLinkItemState>(() => ({
    highlighted: highlighted.value,
  }));

  // 根元素 props：store itemProps → 透传 → getItemProps → highlighted data-*。
  const rootProps = computed<Record<string, any>>(() => {
    const merged: any = mergePropsN<any>([
      itemProps.value,
      elementProps.value,
      getItemProps as any,
    ]);
    if (highlighted.value) {
      merged['data-highlighted'] = '';
    }
    return merged;
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'a',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          ref: useMergedRefs(
            (el: HTMLAnchorElement | null) => {
              linkRef.value = el;
              buttonRef(el);
              listItem.ref(el);
            },
            componentProps.ref as any,
          ),
          props: rootProps.value,
        },
      )}
    </>
  );
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
