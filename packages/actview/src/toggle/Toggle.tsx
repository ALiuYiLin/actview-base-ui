import { computed, ref } from 'actview';
import { useControlled } from '@/utils/useControlled';
import { error } from '@/utils/error';
import { useBaseUiId } from '@/internals/useBaseUiId';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { useToggleGroupContext } from '@/toggle-group/ToggleGroupContext';
import { useButton } from '@/internals/use-button/useButton';
import { CompositeItem } from '@/internals/composite/item/CompositeItem';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';
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
export function Toggle<Value extends string>(componentProps: Toggle.Props<Value>) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 ref：经 params.ref 合并链透传（不用 useRootElement）。
  const buttonRef = ref<HTMLElement | null>(null);
  const onPressedChange = componentProps.onPressedChange;
  const valueProp = componentProps.value;

  // `|| undefined` handles cases, where value is falsy (i.e. "")
  const value = useBaseUiId(valueProp || undefined);
  const groupContext = useToggleGroupContext<Value>();

  const [pressedState, setPressedState] = useControlled<boolean>({
    controlled: () => componentProps.pressed,
    default: () => componentProps.defaultPressed ?? false,
    name: 'Toggle',
    state: 'pressed',
  });

  const {getButtonProps} = useButton({
    disabled: false, // 占位，渲染期按 group 计算
    native: () => componentProps.nativeButton ?? true,
  });

  if (process.env.NODE_ENV !== 'production') {
    // 对齐 React 版 useEffect 警告：仅在 setup 检查一次（group 状态变化场景有限）
    const group = groupContext;
    if (group && valueProp === undefined && group.isValueInitialized) {
      error(
        'A `<Toggle>` component rendered in a `<ToggleGroup>` has no explicit `value` prop.',
        'This will cause issues between the Toggle Group and Toggle values.',
        'Provide the `<Toggle>` with a `value` prop matching the `<ToggleGroup>` values prop type.',
      );
    }
  }

  // pressed/disabled：computed 渲染期实时（group 载体字段与本组件 props 直读）
  const disabled = computed(
    () => (componentProps.disabled ?? false) || (groupContext?.disabled ?? false),
  );
  const pressed = computed(() => {
    const inGroup = Boolean(groupContext) && value !== undefined;
    if (inGroup) {
      const groupValue = groupContext!.value;
      return value !== undefined && groupValue.indexOf(value!) > -1;
    }
    return Boolean(pressedState.value);
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {(() => {
        const {className, render, style, ...elementProps} = componentProps;

        const disabledValue = disabled.value;
        const pressedValue = pressed.value;

        const state: ToggleState = {
          disabled: disabledValue,
          pressed: Boolean(pressedValue),
        };

        const getButtonPropsBound = (previousProps?: Record<string, any>) =>
          getButtonProps({disabled: disabledValue, ...(previousProps ?? {})} as any);

        const props = [
          {
            'aria-pressed': pressedValue,
            // React 契约：disabled 状态始终暴露 aria-disabled（'true'/'false'）
            'aria-disabled': disabledValue ? 'true' : 'false',
            onClick(event: any) {
              const nextPressed = !pressedValue;
              const details = createChangeEventDetails(REASONS.none, event);

              // `onPressedChange` runs before the group commits so that canceling here
              // can also veto the group value change, which shares this `details` object.
              onPressedChange?.(nextPressed, details);

              if (details.isCanceled) {
                return;
              }

              if (groupContext && value) {
                groupContext.setGroupValue(value, nextPressed, details);
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

        // A disabled toggle is natively disabled and cannot hold roving focus.
        // Toolbar reads this metadata to compute its `disabledIndices`.
        const itemMetadata = {disabled: disabledValue, focusableWhenDisabled: false};

        if (groupContext) {
          return (
            <CompositeItem
              tag="button"
              render={render as any}
              className={className as any}
              style={style as any}
              metadata={itemMetadata as any}
              state={state as any}
              refs={[buttonRef as any]}
              props={props as any}
              stateAttributesMapping={toggleStateAttributesMapping}
            />
          );
        }

        return useRenderElement(
          'button',
          {
            className,
            render,
            style,
          },
          {
            state,
            ref: useMergedRefs(buttonRef, componentProps.ref),
            props,
            stateAttributesMapping: toggleStateAttributesMapping,
          },
        );
      })()}
    </>
  );
}

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
