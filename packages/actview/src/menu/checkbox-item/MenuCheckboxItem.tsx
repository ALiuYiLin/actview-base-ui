import { computed, defineComponent, toValue } from 'actview';
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

/**
 * A menu item that toggles a setting on or off.
 * Renders a `<div>` element.
 */
export const MenuCheckboxItem = defineComponent(function MenuCheckboxItem(
  componentProps: MenuCheckboxItem.Props,
) {
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

  const children = toValue(componentProps.children);

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
    nodeId: menuPositionerContext?.value?.nodeId,
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

  return () => {
    const {render, className: cls, style: st, ...elementProps} = componentProps as any;

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
      elementProps,
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

    const mergedRefs = (el: HTMLElement | null) => {
      itemRef?.(el);
      listItem.ref(el);
      if (typeof componentProps.ref === 'function') {
        (componentProps.ref as any)(el);
      } else if (componentProps.ref) {
        componentProps.ref.value = el;
        componentProps.ref.current = el;
      }
    };

    const element = (() => {
      if (render) {
        if (typeof render === 'function') {
          return render({...merged, ...state, ref: mergedRefs} as any);
        }
        const renderProps = render.props ?? {};
        const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
        const Tag = render.type as any;
        const mergedRenderProps = Object.assign({}, merged, restRenderProps);
        mergedRenderProps.className =
          typeof merged.className === 'string' && typeof renderClassName === 'string'
            ? `${merged.className} ${renderClassName}`.trim()
            : (merged.className ?? renderClassName);
        mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
        return <Tag key={render.key} {...mergedRenderProps} ref={mergedRefs}>{children}</Tag>;
      }
      return <div {...merged} ref={mergedRefs}>{children}</div>;
    })();

    return (
      <MenuCheckboxItemContext.Provider value={state as any}>
        {element}
      </MenuCheckboxItemContext.Provider>
    );
  };
});

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
