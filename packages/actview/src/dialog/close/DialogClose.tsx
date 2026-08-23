import { defineComponent, toValue } from 'actview';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { useDialogRootContext } from '../root/DialogRootContext';
import { useButton } from '@/internals/use-button/useButton';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';

/**
 * A button that closes the dialog.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export const DialogClose = defineComponent(function DialogClose(
  componentProps: DialogClose.Props,
) {
  const {disabled = false, nativeButton = true, ...elementProps} = componentProps as any;
  const children = toValue(componentProps.children);

  const {buttonRef, getButtonProps} = useButton({
    disabled,
    focusableWhenDisabled: false,
    native: nativeButton,
  });

  const store = useDialogRootContext(false);

  return () => {
    const {render, className, style, onClick: userOnClick, ...rest} = elementProps as any;

    const merged: any = {
      ...(getButtonProps ?? {}),
      onClick(event: any) {
        if (disabled) {
          return;
        }
        userOnClick?.(event);
        if (!event.defaultPrevented) {
          store.setOpen(false, createChangeEventDetails(REASONS.closePress, event.nativeEvent ?? event));
        }
      },
      ...rest,
    };

    // actview 的 useButton 不产出原生 disabled/data-disabled，渲染期补写。
    if (disabled) {
      if (nativeButton) {
        merged.disabled = true;
      }
      merged['data-disabled'] = '';
    } else {
      delete merged.disabled;
      delete merged['data-disabled'];
    }

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

export interface DialogCloseState {}

export interface DialogCloseProps
  extends NativeButtonProps,
    BaseUIComponentProps<'button', DialogCloseState> {
  children?: any;
  [key: string]: any;
}

export namespace DialogClose {
  export type State = DialogCloseState;
  export type Props = DialogCloseProps;
}
