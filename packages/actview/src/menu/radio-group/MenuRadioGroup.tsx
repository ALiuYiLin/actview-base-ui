import { computed, ref } from 'actview';
import { useControlled } from '@base-ui/actview-utils/useControlled';
import { useStableCallback } from '@base-ui/actview-utils/useStableCallback';
import { MenuRadioGroupContext } from './MenuRadioGroupContext';
import { MenuGroupContext } from '../group/MenuGroupContext';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import type { MenuRoot } from '../root/MenuRoot';
import { mergeProps } from '../../merge-props';

/**
 * Groups related radio items.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuRadioGroup(componentProps: MenuRadioGroup.Props) {
  const {
    render: _render,
    className: _className,
    value: valueProp,
    defaultValue,
    disabled = false,
    style: _style,
    'aria-labelledby': ariaLabelledByProp,
    ...elementProps
  } = componentProps;

  const labelId = ref<string | undefined>(undefined);
  const setLabelId: MenuGroupContext = (next) => {
    labelId.value =
      typeof next === 'function' ? (next as (current: string | undefined) => string | undefined)(labelId.value) : next;
  };

  const value = useControlled({
    controlled: computed(() => componentProps.value),
    default: computed(() => componentProps.defaultValue),
    name: 'MenuRadioGroup',
  });

  const setValue = useStableCallback(
    (newValue: any, eventDetails: MenuRadioGroup.ChangeEventDetails) => {
      componentProps.onValueChange?.(newValue, eventDetails);

      if (eventDetails.isCanceled) {
        return;
      }

      value.setValueIfUncontrolled(newValue);
    },
  );

  const state = computed<MenuRadioGroupState>(() => ({ disabled }));

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: componentProps.ref,
    props: [
      (prev: any) =>
        mergeProps(prev, {
          role: 'group',
          'aria-labelledby': ariaLabelledByProp ?? labelId.value,
          'aria-disabled': disabled || undefined,
        }) as HTMLProps,
      (prev: any) => mergeProps(prev, elementProps) as HTMLProps,
    ],
  });

  const context = computed<MenuRadioGroupContext>(() => ({
    value: value.value,
    setValue,
    disabled,
  }));

  return (
    <MenuGroupContext.Provider value={computed(() => setLabelId)}>
      <MenuRadioGroupContext.Provider value={context}>
        {getElement()}
      </MenuRadioGroupContext.Provider>
    </MenuGroupContext.Provider>
  );
}

export interface MenuRadioGroupProps extends BaseUIComponentProps<'div', MenuRadioGroupState> {
  /**
   * The content of the component.
   */
  children?: any;
  /**
   * The controlled value of the radio item that should be currently selected.
   *
   * To render an uncontrolled radio group, use the `defaultValue` prop instead.
   */
  value?: any;
  /**
   * The uncontrolled value of the radio item that should be initially selected.
   *
   * To render a controlled radio group, use the `value` prop instead.
   */
  defaultValue?: any;
  /**
   * Function called when the selected value changes.
   */
  onValueChange?:
    | ((value: any, eventDetails: MenuRadioGroup.ChangeEventDetails) => void)
    | undefined;
  /**
   * Whether the component should ignore user interaction.
   *
   * @default false
   */
  disabled?: boolean | undefined;
}

export interface MenuRadioGroupState {
  /**
   * Whether the component is disabled.
   */
  disabled: boolean;
}

export type MenuRadioGroupChangeEventReason = MenuRoot.ChangeEventReason;
export type MenuRadioGroupChangeEventDetails = MenuRoot.ChangeEventDetails;

export namespace MenuRadioGroup {
  export type Props = MenuRadioGroupProps;
  export type State = MenuRadioGroupState;
  export type ChangeEventReason = MenuRadioGroupChangeEventReason;
  export type ChangeEventDetails = MenuRadioGroupChangeEventDetails;
}
