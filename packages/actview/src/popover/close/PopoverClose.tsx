import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { usePopoverRootContext } from '@/popover/root/PopoverRootContext';
import { useRenderElement } from '@/internals/useRenderElement';
import { useButton } from '@/internals/use-button';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useClosePartRegistration } from '@/utils/closePart';

/**
 * A button that closes the popover.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverClose(componentProps: PopoverClose.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    disabled = false,
    nativeButton = true,
    ...elementProps
  } = componentProps;

  const { buttonRef, getButtonProps } = useButton({
    disabled,
    focusableWhenDisabled: false,
    native: nativeButton,
  });

  const store = usePopoverRootContext().value!;
  useClosePartRegistration();

  const element = useRenderElement('button', componentProps, {
    ref: [componentProps.ref, buttonRef],
    props: [
      {
        onClick(event: MouseEvent) {
          store.setOpen(false, createChangeEventDetails(REASONS.closePress, event));
        },
      },
      elementProps,
      getButtonProps,
    ],
  });

  return <>{element()}</>;
}

export interface PopoverCloseState {}

export interface PopoverCloseProps
  extends NativeButtonProps, BaseUIComponentProps<'button', PopoverCloseState> {}

export namespace PopoverClose {
  export type State = PopoverCloseState;
  export type Props = PopoverCloseProps;
}
