import {computed, toRefs} from 'actview';
import type { Ref } from 'actview';
import { mergePropsN } from '@/merge-props';
import { NOOP } from '@/utils/empty';
import { MenuCheckboxItemContext } from './MenuCheckboxItemContext';
import { REGULAR_ITEM, useMenuItem } from '../item/useMenuItem';
import { useCompositeListItem } from '@/internals/composite/list/useCompositeListItem';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { itemMapping } from '../utils/stateAttributesMapping';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useControlled } from '@/utils/useControlled';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * A menu item that toggles a setting on or off.
 * Renders a `<div>` element.
 */
export function MenuCheckboxItem(componentProps: MenuCheckboxItem.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const label = componentProps.label;
  const nativeButton = computed(() => componentProps.nativeButton ?? false);

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  // 组件自定义 props 剔除——否则泄漏到 DOM。
  const {
    className,
    render,
    style,
    label: _label,
    nativeButton: _nativeButton,
    disabled: _disabled,
    closeOnClick: _closeOnClick,
    defaultChecked: _defaultChecked,
    checked: _checked,
    onCheckedChange: _onCheckedChange,
    ...elementRefs
  } = toRefs(componentProps) as Record<string, Ref<any>>;

  const listItem = useCompositeListItem({guess: true, label});
  const menuPositionerContext = useMenuPositionerContext(true);
  const id = useBaseUiId(componentProps.id);

  const {store} = useMenuRootContext();
  const rootDisabled = store.useState('disabled');
  const disabled = computed(
    () => (componentProps.disabled ?? false) || rootDisabled.value,
  );
  const highlighted = computed(() => store.select('isActive', listItem.index.value));
  const itemProps = store.useState('itemProps');

  const [checked, setChecked] = useControlled<any>({
    controlled: () => componentProps.checked,
    default: () => componentProps.defaultChecked ?? false,
    name: 'MenuCheckboxItem',
    state: 'checked',
  });

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

  // 事件 handler：setup 闭包读 computed——事件触发时拿到实时值；
  // onCheckedChange 回调 props 事件期直读 componentProps。
  function handleClick(event: any) {
    const details = createChangeEventDetails(REASONS.itemPress, event, undefined, {
      preventUnmountOnClose: NOOP,
    });

    componentProps.onCheckedChange?.(!checked.value, details);
    if (!details.isCanceled) {
      setChecked(!checked.value);
    }
  }

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<MenuCheckboxItemState>(() => ({
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
        role: 'menuitemcheckbox',
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
  const checkboxItemContextValue = {
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
    <MenuCheckboxItemContext.Provider value={checkboxItemContextValue as any}>
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
    </MenuCheckboxItemContext.Provider>
  );
}

export interface MenuCheckboxItemState {
  /**
   * Whether the checkbox item should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the item is highlighted.
   */
  highlighted: boolean;
  /**
   * Whether the item is checked.
   */
  checked: boolean;
}

export interface MenuCheckboxItemProps {
  children?: any;
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
   * @default false
   */
  closeOnClick?: boolean | undefined;
  /**
   * Whether the checkbox item is currently checked.
   * To render an uncontrolled checkbox item, use the `defaultChecked` prop instead.
   */
  checked?: boolean | undefined;
  /**
   * Whether the checkbox item is initially checked.
   * To render a controlled checkbox item, use the `checked` prop instead.
   * @default false
   */
  defaultChecked?: boolean | undefined;
  /**
   * Event handler called when the item is checked or unchecked.
   */
  onCheckedChange?: ((checked: boolean, eventDetails: any) => void) | undefined;
  [key: string]: any;
}

export namespace MenuCheckboxItem {
  export type Props = MenuCheckboxItemProps;
  export type State = MenuCheckboxItemState;
}