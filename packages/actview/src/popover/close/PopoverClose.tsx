import { toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { useButton } from '@/internals/use-button/useButton';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * A button that closes the popover.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverClose(componentProps: PopoverClose.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {disabled = false, nativeButton = true} = componentProps as any;
  const {render, className, style, children, ref: refProp, ...elementProps} =
    toRefs(componentProps);

  const {buttonRef, getButtonProps} = useButton({
    disabled,
    focusableWhenDisabled: false,
    native: nativeButton,
  });

  const store = usePopoverRootContext(false);

  const {element} = useRenderElement({
    props: () => [
      {
        onClick(event: any) {
          store.setOpen(
            false,
            createChangeEventDetails(REASONS.closePress, event.nativeEvent ?? event),
          );
        },
        ...unrefs(elementProps),
        ...(getButtonProps ?? {}),
      },
    ],
    className,
    style,
    render,
    refs: () => {
      const refs: any[] = [];
      if (typeof buttonRef === 'function') {
        refs.push((el: any) => (buttonRef as any)(el));
      } else if (buttonRef) {
        refs.push((el: any) => (buttonRef as any).value = el);
      }
      if (componentProps.ref !== undefined) {
        refs.push(refProp);
      }
      return refs;
    },
    children,
    defaultTag: 'button',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

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
