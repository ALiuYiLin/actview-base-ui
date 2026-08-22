import { computed } from 'actview';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { useToastRootContext } from '@/toast/root/ToastRootContext';
import { useButton } from '@/internals/use-button/useButton';
import { useRenderElement } from '@/internals/useRenderElement';
import { hasRenderableChildren } from '@/toast/utils/isRenderableNode';

/**
 * Performs an action when clicked.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastAction(componentProps: ToastAction.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    disabled,
    nativeButton = true,
    ...elementProps
  } = componentProps;

  const context = useToastRootContext();

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
  });

  const state = computed<ToastActionState>(() => ({ type: context.value.toast.type }));

  const getElement = useRenderElement('button', componentProps, {
    ref: [componentProps.ref, buttonRef],
    state,
    props: [
      elementProps,
      (prev: any) => ({ ...prev, ...context.value.toast.actionProps }),
      getButtonProps,
      (prev: any) => ({
        ...prev,
        children: context.value.toast.actionProps?.children ?? componentProps.children,
      }),
    ],
  });

  return (
    <>
      {(() => {
        const element = getElement();
        return hasRenderableChildren(element) ? element : null;
      })()}
    </>
  );
}

export interface ToastActionState {
  /**
   * The type of the toast.
   */
  type: string | undefined;
}

export interface ToastActionProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ToastActionState> {}

export namespace ToastAction {
  export type State = ToastActionState;
  export type Props = ToastActionProps;
}
