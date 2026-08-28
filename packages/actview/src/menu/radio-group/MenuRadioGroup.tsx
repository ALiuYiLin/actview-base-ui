import { toRefs, unrefs, ref } from 'actview';
import { MenuRadioGroupContext, type MenuRadioGroupContextValue } from './MenuRadioGroupContext';
import { MenuGroupContext } from '../group/MenuGroupContext';
import { useControlled } from '@/utils/useControlled';
import { useStableCallback } from '@/utils/useStableCallback';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * Groups related radio items.
 * Renders a `<div>` element.
 */
export function MenuRadioGroup(componentProps: MenuRadioGroup.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {
    value: valueProp,
    defaultValue,
    onValueChange: onValueChangeProp,
    disabled = false,
    'aria-labelledby': ariaLabelledByProp,
  } = componentProps as any;

  const {render, className, style, children, ref: refProp, ...elementProps} = toRefs(componentProps);

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

  const {element} = useRenderElement({
    props: () => [
      {
        role: 'group',
        'aria-labelledby': ariaLabelledByProp ?? labelId.value,
        'aria-disabled': disabled || undefined,
      },
      unrefs(elementProps),
    ],
    state: (): MenuRadioGroupState => ({disabled}),
    className,
    style,
    render,
    refs: () => (componentProps.ref !== undefined ? [refProp as any] : []),
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <MenuGroupContext.Provider value={setLabelId as any}>
      <MenuRadioGroupContext.Provider
        value={
          {
            value: value.value,
            setValue,
            disabled,
          } as any
        }
      >
        {element()}
      </MenuRadioGroupContext.Provider>
    </MenuGroupContext.Provider>
  );
}

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
