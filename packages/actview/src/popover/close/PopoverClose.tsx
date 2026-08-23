import { defineComponent, toValue } from 'actview';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { useButton } from '@/internals/use-button/useButton';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';

/**
 * A button that closes the popover.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export const PopoverClose = defineComponent(function PopoverClose(
  componentProps: PopoverClose.Props,
) {
  const {disabled = false, nativeButton = true, ...elementProps} = componentProps as any;
  const children = toValue(componentProps.children);

  const {buttonRef, getButtonProps} = useButton({
    disabled,
    focusableWhenDisabled: false,
    native: nativeButton,
  });

  const store = usePopoverRootContext(false);

  return () => {
    const {render, className, style, ...rest} = elementProps as any;

    const merged: any = {
      onClick(event: any) {
        store.setOpen(false, createChangeEventDetails(REASONS.closePress, event.nativeEvent ?? event));
      },
      ...rest,
      ...(getButtonProps ?? {}),
    };

    const mergedRefs = (el: HTMLButtonElement | null) => {
      if (typeof buttonRef === 'function') {
        (buttonRef as any)(el);
      } else if (buttonRef) {
        (buttonRef as any).value = el;
      }
      if (typeof componentProps.ref === 'function') {
        (componentProps.ref as any)(el);
      } else if (componentProps.ref) {
        (componentProps.ref as any).value = el;
        (componentProps.ref as any).current = el;
      }
    };

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ref: mergedRefs} as any);
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof className === 'string' && typeof renderClassName === 'string'
          ? `${className} ${renderClassName}`.trim()
          : (className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={mergedRefs}>{children}</Tag>;
    }
    return (
      <button {...merged} className={className} ref={mergedRefs}>
        {children}
      </button>
    );
  };
});

export interface PopoverCloseState {}

export interface PopoverCloseProps
  extends NativeButtonProps,
    BaseUIComponentProps<'button', PopoverCloseState> {
  children?: any;
  [key: string]: any;
}

export namespace PopoverClose {
  export type State = PopoverCloseState;
  export type Props = PopoverCloseProps;
}
