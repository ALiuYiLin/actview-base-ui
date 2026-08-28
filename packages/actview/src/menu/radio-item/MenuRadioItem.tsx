import {computed, toRefs} from 'actview';
import type { Ref } from 'actview';
import { mergePropsN } from '@/merge-props';
import { NOOP } from '@/utils/empty';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useMenuRadioGroupContext } from '../radio-group/MenuRadioGroupContext';
import { MenuRadioItemContext } from './MenuRadioItemContext';
import { itemMapping } from '../utils/stateAttributesMapping';
import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import { REGULAR_ITEM, useMenuItem } from '../item/useMenuItem';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * A menu item that works like a radio button in a given group.
 * Renders a `<div>` element.
 */
export function MenuRadioItem(componentProps: MenuRadioItem.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const label = componentProps.label;
  const nativeButton = computed(() => componentProps.nativeButton ?? false);
  const value = componentProps.value;

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  const listItem = useCompositeListItem({guess: true, label});
  const menuPositionerContext = useMenuPositionerContext(true);
  const id = useBaseUiId(componentProps.id);

  const {store} = useMenuRootContext();
  const itemProps = store.useState('itemProps');
  const highlighted = computed(() => store.select('isActive', listItem.index.value));

  // context 载体直取（store-as-is）：getter 字段渲染期属性访问实时。
  const radioGroupContext = useMenuRadioGroupContext() as any;

  const rootDisabled = store.useState('disabled');
  const disabled = computed(
    () =>
      (componentProps.disabled ?? false) ||
      radioGroupContext.disabled ||
      rootDisabled.value,
  );
  const checked = computed(() => radioGroupContext.value === value);

  const {getItemProps, itemRef} = useMenuItem({
    closeOnClick: componentProps.closeOnClick ?? false,
    disabled: disabled.value,
    highlighted: false, // data-highlighted 由 rootProps computed 计算
    id,
    store,
    nativeButton: nativeButton.value,
    nodeId: menuPositionerContext?.nodeId,
    itemMetadata: REGULAR_ITEM,
  });

  // 事件 handler：setup 闭包——事件触发时拿到实时值。
  function setSelectedValue(newValue: any, eventDetails: any) {
    radioGroupContext.setValue(newValue, eventDetails);
  }

  function handleClick(event: any) {
    const details = createChangeEventDetails(REASONS.itemPress, event, undefined, {
      preventUnmountOnClose: NOOP,
    });

    setSelectedValue(value, details);
  }

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<MenuRadioItemState>(() => ({
    disabled: disabled.value,
    highlighted: highlighted.value,
    checked: checked.value,
  }));

  // 根元素 props：store itemProps → role/aria/handler → 透传 → getItemProps →
  // checked/highlighted/disabled data-*。
  const rootProps = computed<Record<string, any>>(() => {
    const stateValue = state.value;
    const merged: any = mergePropsN<any>([
      itemProps.value,
      {
        role: 'menuitemradio',
        'aria-checked': stateValue.checked,
        onClick: handleClick,
      },
      elementProps.value,
      getItemProps as any,
    ]);
    if (stateValue.checked) {
      merged[itemMapping.checkedKey] = '';
    } else {
      merged[itemMapping.uncheckedKey] = '';
    }
    if (stateValue.highlighted) {
      merged['data-highlighted'] = '';
    }
    if (stateValue.disabled) {
      merged['data-disabled'] = '';
    }
    return merged;
  });

  // store-as-is 载体：身份稳定的 getter 对象。
  const radioItemContextValue = {
    get disabled() {
      return disabled.value;
    },
    get highlighted() {
      return highlighted.value;
    },
    get checked() {
      return checked.value;
    },
  };

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <MenuRadioItemContext.Provider value={radioItemContextValue as any}>
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
    </MenuRadioItemContext.Provider>
  );
}

export interface MenuRadioItemState {
  /**
   * Whether the radio item should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the item is highlighted.
   */
  highlighted: boolean;
  /**
   * Whether the item is selected.
   */
  checked: boolean;
}

export interface MenuRadioItemProps {
  children?: any;
  /**
   * Overrides the text label to use when the item is matched during keyboard text navigation.
   */
  label?: string | undefined;
  /**
   * @ignore
   */
  id?: string | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether to close the menu when the item is clicked.
   * @default false
   */
  closeOnClick?: boolean | undefined;
  /**
   * The value of the radio item that is used to identify it within its group.
   */
  value?: any;
  [key: string]: any;
}

export namespace MenuRadioItem {
  export type Props = MenuRadioItemProps;
  export type State = MenuRadioItemState;
}