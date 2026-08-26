import { toValue } from 'actview';
import { FloatingPortal } from '@/floating-ui-react';
import { InternalBackdrop } from '@/utils/InternalBackdrop';
import { inertValue } from '@/utils/inertValue';
import { useDialogRootContext } from '../root/DialogRootContext';
import { DialogPortalContext } from './DialogPortalContext';
import type { Ref } from 'actview';

/**
 * A portal element that moves the dialog to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export function DialogPortal(props: DialogPortal.Props) {
  // ============ setup（只执行一次） ============
  const {keepMounted = false, ...portalProps} = props as any;

  const store = useDialogRootContext(false);
  const mounted = store.useState('mounted');
  const modal = store.useState('modal');
  const open = store.useState('open');

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <DialogPortalContext.Provider value={keepMounted}>
      {mounted.value || keepMounted ? (
        <FloatingPortal {...portalProps}>
          {mounted.value && modal.value === true && (
            <InternalBackdrop
              ref={store.context.internalBackdropRef as any}
              inert={inertValue(!toValue(open))}
            />
          )}
          {props.children}
        </FloatingPortal>
      ) : null}
    </DialogPortalContext.Provider>
  );
}

export interface DialogPortalState {}

export interface DialogPortalProps {
  /**
   * Whether to keep the portal mounted in the DOM while the dialog is hidden.
   * @default false
   */
  keepMounted?: boolean | undefined;
  /**
   * A parent element to render the portal element into.
   */
  container?: HTMLElement | ShadowRoot | Ref<HTMLElement | ShadowRoot | null> | null | undefined;
  children?: any;
  [key: string]: any;
}

export namespace DialogPortal {
  export type State = DialogPortalState;
  export type Props = DialogPortalProps;
}
