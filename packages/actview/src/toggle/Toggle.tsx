import { computed, watch } from 'actview';
import { useControlled } from '@base-ui/actview-utils/useControlled';
import { error } from '@base-ui/actview-utils/error';
import { useBaseUiId } from '../internals/useBaseUiId';
import { useRenderElement } from '../internals/useRenderElement';
import type { BaseUIComponentProps, NativeButtonProps } from '../internals/types';
import { useToggleGroupContext } from '../toggle-group/ToggleGroupContext';
import type { ToolbarRoot } from '../toolbar/root/ToolbarRoot';
import { useButton } from '../internals/use-button/useButton';
import { CompositeItem } from '../internals/composite/item/CompositeItem';
import {
  type BaseUIChangeEventDetails,
  createChangeEventDetails,
} from '../internals/createBaseUIEventDetails';
import { REASONS } from '../internals/reasons';

/**
 * A two-state button that can be on or off.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Toggle](https://base-ui.com/react/components/toggle)
 */
export function Toggle<Value extends string>(props: Toggle.Props<Value>) {
  // `|| undefined` handles cases, where value is falsy (i.e. "").
  // The toggle's `value` is a stable identifier, so it is read once at setup.
  const value = useBaseUiId(props.value || undefined);
  const groupContext = useToggleGroupContext();

  const disabled = computed<boolean>(() => (props.disabled || groupContext.value?.disabled) ?? false);

  if (process.env.NODE_ENV !== 'production') {
    watch(
      () =>
        groupContext.value !== undefined &&
        props.value === undefined &&
        groupContext.value.isValueInitialized,
      (shouldWarn) => {
        if (shouldWarn) {
          error(
            'A `<Toggle>` component rendered in a `<ToggleGroup>` has no explicit `value` prop.',
            'This will cause issues between the Toggle Group and Toggle values.',
            'Provide the `<Toggle>` with a `value` prop matching the `<ToggleGroup>` values prop type.',
          );
        }
      },
    );
  }

  const pressed = useControlled<boolean>({
    controlled: () =>
      groupContext.value
        ? value !== undefined && (groupContext.value.value ?? []).indexOf(value) > -1
        : props.pressed,
    default: () => props.defaultPressed ?? false,
    name: 'Toggle',
    state: 'pressed',
  });

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: () => props.nativeButton ?? true,
  });

  const state = computed<ToggleState>(() => ({
    disabled: disabled.value,
    pressed: pressed.value ?? false,
  }));

  const refs = [buttonRef, props.ref];

  const getToggleProps = () => ({
    'aria-pressed': pressed.value ?? false,
    onClick(event: MouseEvent) {
      const nextPressed = !(pressed.value ?? false);
      const details = createChangeEventDetails(REASONS.none, event);

      // `onPressedChange` runs before the group commits so that canceling here
      // can also veto the group value change, which shares this `details` object.
      props.onPressedChange?.(nextPressed, details);

      if (details.isCanceled) {
        return;
      }

      if (value) {
        groupContext.value?.setGroupValue?.(value, nextPressed, details);
      }

      if (details.isCanceled) {
        return;
      }

      pressed.setValueIfUncontrolled(nextPressed);
    },
  });

  const getElementProps = () => {
    const {
      className: _className,
      defaultPressed: _defaultPressed,
      disabled: _disabled,
      form: _form,
      onPressedChange: _onPressedChange,
      pressed: _pressed,
      render: _render,
      type: _type,
      value: _value,
      nativeButton: _nativeButton,
      style: _style,
      ref: _ref,
      ...elementProps
    } = props;
    return elementProps;
  };

  const elementPropsArray = [getToggleProps, getElementProps, getButtonProps];

  const getElement = useRenderElement('button', props, {
    enabled: !groupContext.value,
    state,
    ref: refs,
    props: elementPropsArray,
  });

  // A disabled toggle is natively disabled and cannot hold roving focus.
  // Toolbar reads this metadata to compute its `disabledIndices`.
  const itemMetadata = computed<ToolbarRoot.ItemMetadata>(() => ({
    disabled: disabled.value,
    focusableWhenDisabled: false,
  }));

  return groupContext.value ? (
    <CompositeItem
      tag="button"
      render={props.render}
      className={props.className}
      style={props.style}
      metadata={itemMetadata.value}
      state={state.value}
      refs={refs}
      props={elementPropsArray}
    />
  ) : (
    getElement()
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

export namespace Toggle {
  export type State = ToggleState;
  export type Props<TValue extends string = string> = ToggleProps<TValue>;
  export type ChangeEventReason = ToggleChangeEventReason;
  export type ChangeEventDetails = ToggleChangeEventDetails;
}
