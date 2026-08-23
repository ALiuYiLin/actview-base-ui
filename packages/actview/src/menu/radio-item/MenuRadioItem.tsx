import { computed, defineComponent, toValue } from 'actview';
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

/**
 * A menu item that works like a radio button in a given group.
 * Renders a `<div>` element.
 */
export const MenuRadioItem = defineComponent(function MenuRadioItem(
  componentProps: MenuRadioItem.Props,
) {
  const {
    id: idProp,
    label,
    nativeButton = false,
    disabled: disabledProp = false,
    closeOnClick = false,
    value,
  } = componentProps as any;

  const children = toValue(componentProps.children);

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

  return () => {
    const {render, className: cls, style: st, ...elementProps} = componentProps as any;

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

    return <MenuRadioItemContext.Provider value={state as any}>{element}</MenuRadioItemContext.Provider>;
  };
});

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
