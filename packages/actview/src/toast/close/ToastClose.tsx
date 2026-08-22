import { computed, ref } from 'actview';
import type { BaseUIComponentProps, NativeButtonProps, HTMLProps } from '@/internals/types';
import { useToastRootContext } from '@/toast/root/ToastRootContext';
import { useToastProviderContext } from '@/toast/provider/ToastProviderContext';
import { useButton } from '@/internals/use-button/useButton';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Closes the toast when clicked.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastClose(componentProps: ToastClose.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    disabled,
    nativeButton = true,
    ...elementProps
  } = componentProps;

  const store = useToastProviderContext().value!;
  const { toast } = useToastRootContext().value!;
  const context = useToastRootContext();

  const hasFocus = ref(false);

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
  });

  const state = computed<ToastCloseState>(() => ({ type: toast.type }));

  const getDefaultProps = (): HTMLProps => ({
    'aria-hidden': !context.value.expanded && !hasFocus.value,
    onClick() {
      store.closeToast(toast.id);
    },
    onFocus() {
      hasFocus.value = true;
    },
    onBlur() {
      hasFocus.value = false;
    },
  });

  const getElement = useRenderElement('button', componentProps, {
    ref: [componentProps.ref, buttonRef],
    state,
    props: [getDefaultProps, elementProps, getButtonProps],
  });

  return <>{getElement()}</>;
}

export interface ToastCloseState {
  /**
   * The type of the toast.
   */
  type: string | undefined;
}

export interface ToastCloseProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ToastCloseState> {}

export namespace ToastClose {
  export type State = ToastCloseState;
  export type Props = ToastCloseProps;
}
