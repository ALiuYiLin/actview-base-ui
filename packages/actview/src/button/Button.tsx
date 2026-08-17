import { computed } from 'actview';
import { useButton } from '../internals/use-button/useButton';
import { useRenderElement } from '../internals/useRenderElement';
import type { BaseUIComponentProps, NativeButtonProps } from '../internals/types';

/**
 * A button component that can be used to trigger actions.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Button](https://base-ui.com/react/components/button)
 */
export function Button(componentProps: Button.Props) {
  const getElementProps = () => {
    const {
      render: _render,
      className: _className,
      disabled: _disabled,
      focusableWhenDisabled: _focusableWhenDisabled,
      nativeButton: _nativeButton,
      style: _style,
      ...elementProps
    } = componentProps;
    return elementProps;
  };

  const disabled = computed(() => componentProps.disabled ?? false);
  const focusableWhenDisabled = computed(() => componentProps.focusableWhenDisabled ?? false);
  const nativeButton = computed(() => componentProps.nativeButton ?? true);

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    focusableWhenDisabled,
    native: nativeButton,
  });

  const state = computed(
    () =>
      ({
        disabled: disabled.value,
      }) as ButtonState,
  );

  const getElement = useRenderElement('button', componentProps, {
    state,
    ref: [componentProps.ref, buttonRef],
    props: [getElementProps, getButtonProps],
  });

  // Must end with a JSX return so the Babel transform wraps this component in
  // `defineComponent` (a bare `return getElement()` is not recognized).
  return <>{getElement()}</>;
}

export interface ButtonState {
  /**
   * Whether the button should ignore user interaction.
   */
  disabled: boolean;
}

export interface ButtonProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ButtonState> {
  /**
   * Whether the button should be focusable when disabled.
   * @default false
   */
  focusableWhenDisabled?: boolean | undefined;
}

export namespace Button {
  export type State = ButtonState;
  export type Props = ButtonProps;
}
