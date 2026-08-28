import {computed, toRefs, unrefs, toValue} from 'actview';
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
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * A menu item that works like a radio button in a given group.
 * Renders a `<div>` element.
 */
export function MenuRadioItem(componentProps: MenuRadioItem.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {
    id: idProp,
    label,
    nativeButton = false,
    disabled: disabledProp = false,
    closeOnClick = false,
    value,
  } = componentProps as any;

  const {render, className, style, children, ref, ...elementProps} = toRefs(componentProps);

  const listItem = useCompositeListItem({guess: true, label});
  const menuPositionerContext = useMenuPositionerContext(true);
  const id = useBaseUiId(idProp);

  const {store} = useMenuRootContext();
  const itemProps = store.useState('itemProps');
  const highlighted = computed(() => store.select('isActive', toValue(listItem.index)));

  const radioGroupContext = useMenuRadioGroupContext() as any;

  const rootDisabled = store.useState('disabled');
  const disabled = disabledProp || radioGroupContext.value.disabled || rootDisabled.value;
  const checked = () => radioGroupContext.value.value === value;

  function setSelectedValue(newValue: any, eventDetails: any) {
    radioGroupContext.value.setValue(newValue, eventDetails);
  }

  const {getItemProps, itemRef} = useMenuItem({
    closeOnClick,
    disabled,
    highlighted: false,
    id,
    store,
    nativeButton,
    nodeId: menuPositionerContext?.value?.nodeId,
    itemMetadata: REGULAR_ITEM,
  });

  function handleClick(event: any) {
    const details = createChangeEventDetails(REASONS.itemPress, event, undefined, {
      preventUnmountOnClose: NOOP,
    });

    setSelectedValue(value, details);
  }

  const {element} = useRenderElement({
    props: () => {
      const state: MenuRadioItemState = {
        disabled,
        highlighted: highlighted.value,
        checked: checked(),
      };
      const merged: any = mergePropsN<any>([
        itemProps.value,
        {
          role: 'menuitemradio',
          'aria-checked': state.checked,
          onClick: handleClick,
        },
        unrefs(elementProps),
        getItemProps as any,
      ]);
      if (state.checked) {
        merged[itemMapping.checkedKey] = '';
      } else {
        merged[itemMapping.uncheckedKey] = '';
      }
      if (state.highlighted) {
        merged['data-highlighted'] = '';
      }
      if (state.disabled) {
        merged['data-disabled'] = '';
      }
      return [merged];
    },
    state: (): MenuRadioItemState => ({
      disabled,
      highlighted: highlighted.value,
      checked: checked(),
    }),
    className,
    style,
    render,
    refs: () => {
      const refs: any[] = [
        (el: HTMLElement | null) => {
          itemRef?.(el);
          listItem.ref(el);
        },
      ];
      if (componentProps.ref !== undefined) {
        refs.push(ref);
      }
      return refs;
    },
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <MenuRadioItemContext.Provider
      value={
        {
          disabled,
          highlighted: highlighted.value,
          checked: checked(),
        } as any
      }
    >
      {element()}
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
  [key: string]: any;
}

export namespace MenuRadioItem {
  export type State = MenuRadioItemState;
  export type Props = MenuRadioItemProps;
}
