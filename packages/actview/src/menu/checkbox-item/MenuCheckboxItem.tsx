import {computed, toRefs, unrefs, toValue, ref} from 'actview';
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
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * A menu item that toggles a setting on or off.
 * Renders a `<div>` element.
 */
export function MenuCheckboxItem(componentProps: MenuCheckboxItem.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {
    id: idProp,
    label,
    nativeButton = false,
    disabled: disabledProp = false,
    closeOnClick = false,
    checked: checkedProp,
    defaultChecked,
    onCheckedChange,
  } = componentProps as any;

  const {render, className, style, children, ref, ...elementProps} = toRefs(componentProps);

  const listItem = useCompositeListItem({guess: true, label});
  const menuPositionerContext = useMenuPositionerContext(true);
  const id = useBaseUiId(idProp);

  const {store} = useMenuRootContext();
  const rootDisabled = store.useState('disabled');
  const disabled = disabledProp || rootDisabled.value;
  const highlighted = computed(() => store.select('isActive', toValue(listItem.index)));
  const itemProps = store.useState('itemProps');

  const [checked, setChecked] = useControlled<any>({
    controlled: checkedProp,
    default: defaultChecked ?? false,
    name: 'MenuCheckboxItem',
    state: 'checked',
  });

  const {getItemProps, itemRef} = useMenuItem({
    closeOnClick,
    disabled,
    highlighted: false,
    id,
    store,
    nativeButton,
    nodeId: menuPositionerContext?.nodeId,
    itemMetadata: REGULAR_ITEM,
  });

  function handleClick(event: any) {
    const details = createChangeEventDetails(REASONS.itemPress, event, undefined, {
      preventUnmountOnClose: NOOP,
    });

    onCheckedChange?.(!checked.value, details);
    if (!details.isCanceled) {
      setChecked(!checked.value);
    }
  }

  const {element} = useRenderElement({
    props: () => {
      const state: MenuCheckboxItemState = {
        disabled,
        highlighted: highlighted.value,
        checked: checked.value,
      };
      const merged: any = mergePropsN<any>([
        itemProps.value,
        {
          role: 'menuitemcheckbox',
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
    state: (): MenuCheckboxItemState => ({
      disabled,
      highlighted: highlighted.value,
      checked: checked.value,
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
    <MenuCheckboxItemContext.Provider
      value={
        {
          disabled,
          highlighted: highlighted.value,
          checked: checked.value,
        } as any
      }
    >
      {element()}
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
  [key: string]: any;
}

export namespace MenuCheckboxItem {
  export type State = MenuCheckboxItemState;
  export type Props = MenuCheckboxItemProps;
}
