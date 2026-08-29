import {computed, toRefs} from 'actview';
import type { Ref } from 'actview';
import { REGULAR_ITEM, useMenuItem } from './useMenuItem';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useBaseUiId } from '@/internals/useBaseUiId';
import type { BaseUIComponentProps, NonNativeButtonProps } from '@/internals/types';
import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * An individual interactive item in the menu.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuItem(componentProps: MenuItem.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const label = componentProps.label;
  const nativeButton = computed(() => componentProps.nativeButton ?? false);
  const disabled = computed(
    () => (componentProps.disabled ?? false) || rootDisabled.value,
  );
  const closeOnClick = computed(() => componentProps.closeOnClick ?? true);

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  // 组件自定义 props（label/closeOnClick/nativeButton/disabled）剔除——否则泄漏。
  const {
    className,
    render,
    style,
    label: _label,
    closeOnClick: _closeOnClick,
    nativeButton: _nativeButton,
    disabled: _disabled,
    ...elementRefs
  } = toRefs(componentProps) as Record<string, Ref<any>>;

  const listItem = useCompositeListItem({guess: true, label});
  const menuPositionerContext = useMenuPositionerContext(true);
  const id = useBaseUiId(componentProps.id);

  const {store} = useMenuRootContext();
  const rootDisabled = store.useState('disabled');
  const activeIndex = store.useState('activeIndex');
  const itemProps = store.useState('itemProps');

  const {getItemProps, itemRef} = useMenuItem({
    closeOnClick: closeOnClick.value,
    disabled: disabled.value,
    highlighted: false, // data-highlighted 由 rootProps computed 按 activeIndex 计算
    id,
    store,
    nativeButton: nativeButton.value,
    nodeId: menuPositionerContext?.nodeId,
    itemMetadata: REGULAR_ITEM,
  });

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const highlighted = computed(() => activeIndex.value === listItem.index.value);

  const state = computed<MenuItemState>(() => ({
    disabled: disabled.value,
    highlighted: highlighted.value,
  }));

  // 根元素 props：store itemProps → 透传 → getItemProps → highlighted/
  // disabled data-*。
  const rootProps = computed<Record<string, any>>(() => {
    const merged: any = {};
    for (const prop of [itemProps.value, elementProps.value, getItemProps as any]) {
      const resolved = typeof (prop as any) === 'function' ? (prop as any)(merged) : prop;
      Object.assign(merged, resolved);
    }

    // `data-highlighted` / `data-disabled` state attributes
    if (highlighted.value) {
      merged['data-highlighted'] = '';
    }
    if (disabled.value) {
      merged['data-disabled'] = '';
    }
    return merged;
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          ref: useMergedRefs(
            (el: HTMLElement | null) => {
              itemRef?.(el);
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
