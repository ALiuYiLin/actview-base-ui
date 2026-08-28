import { toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { useDialogRootContext } from '@/dialog/root/DialogRootContext';
import { useButton } from '@/internals/use-button/useButton';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * A button that closes the Drawer.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/Drawer)
 */
export function DrawerClose(componentProps: DrawerClose.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {disabled = false, nativeButton = true} = componentProps as any;
  const {render, className, style, children, ref: refProp, onClick: userOnClick, ...elementProps} =
    toRefs(componentProps);

  const {buttonRef, getButtonProps} = useButton({
    disabled,
    focusableWhenDisabled: false,
    native: nativeButton,
  });

  const store = useDialogRootContext(false);

  const {element} = useRenderElement({
    props: () => {
      const merged: any = {
        ...(getButtonProps ?? {}),
        onClick(event: any) {
          if (disabled) {
            return;
          }
          userOnClick?.value?.(event);
          if (!event.defaultPrevented) {
            store.setOpen(
              false,
              createChangeEventDetails(REASONS.closePress, event.nativeEvent ?? event),
            );
          }
        },
        ...unrefs(elementProps),
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
      return [merged];
    },
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

export interface DrawerCloseState {}

export interface DrawerCloseProps
  extends NativeButtonProps,
    BaseUIComponentProps<'button', DrawerCloseState> {
  children?: any;
  [key: string]: any;
}

export namespace DrawerClose {
  export type State = DrawerCloseState;
  export type Props = DrawerCloseProps;
}
