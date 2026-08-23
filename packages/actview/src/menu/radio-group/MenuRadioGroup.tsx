import { defineComponent, ref, toValue } from 'actview';
import { MenuRadioGroupContext, type MenuRadioGroupContextValue } from './MenuRadioGroupContext';
import { MenuGroupContext } from '../group/MenuGroupContext';
import { useControlled } from '@/utils/useControlled';
import { useStableCallback } from '@/utils/useStableCallback';

/**
 * Groups related radio items.
 * Renders a `<div>` element.
 */
export const MenuRadioGroup = defineComponent(function MenuRadioGroup(
  componentProps: MenuRadioGroup.Props,
) {
  const {
    value: valueProp,
    defaultValue,
    onValueChange: onValueChangeProp,
    disabled = false,
    'aria-labelledby': ariaLabelledByProp,
  } = componentProps as any;

  const children = toValue(componentProps.children);
  const labelId = ref<string | undefined>(undefined);

  const setLabelId = (
    value: string | undefined | ((current: string | undefined) => string | undefined),
  ) => {
    labelId.value = typeof value === 'function' ? (value as any)(labelId.value) : value;
  };

  const [value, setValueUnwrapped] = useControlled<any>({
    controlled: valueProp,
    default: defaultValue,
    name: 'MenuRadioGroup',
  });

  const setValue = useStableCallback((newValue: any, eventDetails: any) => {
    onValueChangeProp?.(newValue, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setValueUnwrapped(newValue);
  });

  return () => {
    const {render, className: cls, style: st, ...elementProps} = componentProps as any;

    const context: MenuRadioGroupContextValue = {
      value: value.value,
      setValue,
      disabled,
    };

    const merged: any = {
      role: 'group',
      'aria-labelledby': ariaLabelledByProp ?? labelId.value,
      'aria-disabled': disabled || undefined,
      ...elementProps,
    };

    const mergedRefs = (el: HTMLElement | null) => {
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
          return render({...merged, disabled, ref: mergedRefs} as any);
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
      <MenuGroupContext.Provider value={setLabelId as any}>
        <MenuRadioGroupContext.Provider value={context as any}>
          {element}
        </MenuRadioGroupContext.Provider>
      </MenuGroupContext.Provider>
    );
  };
});

export interface MenuRadioGroupProps {
  /**
   * The content of the component.
   */
  children?: any;
  /**
   * The controlled value of the radio item that should be currently selected.
   */
  value?: any;
  /**
   * The uncontrolled value of the radio item that should be initially selected.
   */
  defaultValue?: any;
  /**
   * Function called when the selected value changes.
   */
  onValueChange?: ((value: any, eventDetails: any) => void) | undefined;
  /**
   * Whether the component should ignore user interaction.
   *
   * @default false
   */
  disabled?: boolean | undefined;
  [key: string]: any;
}

export interface MenuRadioGroupState {
  /**
   * Whether the component is disabled.
   */
  disabled: boolean;
}

export type MenuRadioGroupChangeEventReason = string;
export type MenuRadioGroupChangeEventDetails = any;

export namespace MenuRadioGroup {
  export type Props = MenuRadioGroupProps;
  export type State = MenuRadioGroupState;
  export type ChangeEventReason = MenuRadioGroupChangeEventReason;
  export type ChangeEventDetails = MenuRadioGroupChangeEventDetails;
}
