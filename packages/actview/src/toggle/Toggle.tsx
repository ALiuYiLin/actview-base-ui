import { defineComponent, toValue } from 'actview';
import { useControlled } from '@/utils/useControlled';
import { error } from '@/utils/error';
import { useBaseUiId } from '@/internals/useBaseUiId';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { useToggleGroupContext } from '@/toggle-group/ToggleGroupContext';
import { useButton } from '@/internals/use-button/useButton';
import { CompositeItem } from '@/internals/composite/item/CompositeItem';
import { useRenderElement } from '@/internals/useRenderElementLegacy';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';

/**
 * A two-state button that can be on or off.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Toggle](https://base-ui.com/react/components/toggle)
 */
export const Toggle = defineComponent(function <Value extends string>(
  componentProps: Toggle.Props<Value>,
) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const defaultPressed = toValue(componentProps.defaultPressed) ?? false;
  const disabledProp = toValue(componentProps.disabled) ?? false;
  const onPressedChange = componentProps.onPressedChange;
  const pressedProp = toValue(componentProps.pressed);
  const valueProp = toValue(componentProps.value);
  const nativeButton = toValue(componentProps.nativeButton) ?? true;

  // `|| undefined` handles cases, where value is falsy (i.e. "")
  const value = useBaseUiId(valueProp || undefined);
  const groupContextRef = useToggleGroupContext();

  const [pressedState, setPressedState] = useControlled({
    controlled: pressedProp,
    default: defaultPressed,
    name: 'Toggle',
    state: 'pressed',
  });

  const {getButtonProps, buttonRef} = useButton({
    disabled: false, // 占位，render 期按 group 计算
    native: nativeButton,
  });

  if (process.env.NODE_ENV !== 'production') {
    // 对齐 React 版 useEffect 警告：仅在 setup 检查一次（group 状态变化场景有限）
    const group = groupContextRef.value;
    if (group && valueProp === undefined && group.isValueInitialized) {
      error(
        'A `<Toggle>` component rendered in a `<ToggleGroup>` has no explicit `value` prop.',
        'This will cause issues between the Toggle Group and Toggle values.',
        'Provide the `<Toggle>` with a `value` prop matching the `<ToggleGroup>` values prop type.',
      );
    }
  }

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {className, render, style, ...elementProps} = componentProps;

    const groupContext = groupContextRef.value;
    const groupValue = groupContext?.value.value ?? [];
    const disabled = (disabledProp || groupContext?.disabled) ?? false;
    const inGroup = Boolean(groupContext) && value !== undefined;

    const pressed = inGroup
      ? value !== undefined && groupValue.indexOf(value) > -1
      : pressedState.value;

    const state: ToggleState = {
      disabled,
      pressed: Boolean(pressed),
    };

    const getButtonPropsBound = (previousProps?: Record<string, any>) =>
      getButtonProps({disabled, ...(previousProps ?? {})} as any);

    const props = [
      {
        'aria-pressed': pressed,
        // React 契约：disabled 状态始终暴露 aria-disabled（'true'/'false'）
        'aria-disabled': disabled ? 'true' : 'false',
        onClick(event: any) {
          const nextPressed = !pressed;
          const details = createChangeEventDetails(REASONS.none, event);

          // `onPressedChange` runs before the group commits so that canceling here
          // can also veto the group value change, which shares this `details` object.
          onPressedChange?.(nextPressed, details);

          if (details.isCanceled) {
            return;
          }

          if (inGroup && value) {
            groupContext?.setGroupValue(value, nextPressed, details);
          }

          if (details.isCanceled) {
            return;
          }

          setPressedState(nextPressed);
        },
      },
      elementProps,
      getButtonPropsBound,
    ];

    const refs = [buttonRef];

    // A disabled toggle is natively disabled and cannot hold roving focus.
    // Toolbar reads this metadata to compute its `disabledIndices`.
    const itemMetadata = {disabled, focusableWhenDisabled: false};

    if (groupContext) {
      return (
        <CompositeItem
          tag="button"
          render={render as any}
          className={className as any}
          style={style as any}
          metadata={itemMetadata as any}
          state={state as any}
          refs={refs as any}
          props={props as any}
          stateAttributesMapping={toggleStateAttributesMapping}
        />
      );
    }

    const {element} = useRenderElement({
      props: () => props,
      state: () => state,
      stateAttributesMapping: toggleStateAttributesMapping,
      className: () => className,
      style: () => style,
      render: () => render,
      refs: () => refs,
      children: () => componentProps.children,
      defaultTag: 'button',
    });
    return element();
  };
}) as unknown as <Value extends string>(props: Toggle.Props<Value>) => JSX.Element;

export interface ToggleState {
  /**
   * Whether the toggle is currently pressed.
   */
  pressed: boolean;
  /**
   * Whether the toggle should ignore user interaction.
   */
  disabled: boolean;
}

export interface ToggleProps<Value extends string>
  extends NativeButtonProps, BaseUIComponentProps<'button', ToggleState> {
  /**
   * Whether the toggle button is currently pressed.
   * This is the controlled counterpart of `defaultPressed`.
   */
  pressed?: boolean | undefined;
  /**
   * Whether the toggle button is currently pressed.
   * This is the uncontrolled counterpart of `pressed`.
   * @default false
   */
  defaultPressed?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Callback fired when the pressed state is changed.
   */
  onPressedChange?:
    | ((pressed: boolean, eventDetails: Toggle.ChangeEventDetails) => void)
    | undefined;
  /**
   * A unique string that identifies the toggle when used
   * inside a toggle group.
   */
  value?: Value | undefined;
}

export type ToggleChangeEventReason = typeof REASONS.none;

export type ToggleChangeEventDetails = BaseUIChangeEventDetails<Toggle.ChangeEventReason>;

// state → data-* 属性（React 契约：pressed → data-pressed、disabled → data-disabled）
const toggleStateAttributesMapping: StateAttributesMapping<ToggleState> = {
  pressed: (v) => (v ? {'data-pressed': ''} : null),
  disabled: (v) => (v ? {'data-disabled': ''} : null),
};

export namespace Toggle {
  export type State = ToggleState;
  export type Props<TValue extends string = string> = ToggleProps<TValue>;
  export type ChangeEventReason = ToggleChangeEventReason;
  export type ChangeEventDetails = ToggleChangeEventDetails;
}
