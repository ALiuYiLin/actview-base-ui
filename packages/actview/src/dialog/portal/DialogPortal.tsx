import { defineComponent } from 'actview';
import { FloatingPortal } from '@/floating-ui-react';
import { useDialogRootContext } from '../root/DialogRootContext';
import { DialogPortalContext } from './DialogPortalContext';

/**
 * A portal element that moves the dialog to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export const DialogPortal = defineComponent(function DialogPortal(props: DialogPortal.Props) {
  const {keepMounted = false, ...portalProps} = props as any;

  const store = useDialogRootContext(false);
  const mounted = store.useState('mounted');

  return () => {
    const shouldRender = mounted.value || keepMounted;
    if (!shouldRender) {
      return null;
    }

    return (
      <DialogPortalContext.Provider value={keepMounted}>
        <FloatingPortal {...portalProps} />
      </DialogPortalContext.Provider>
    );
  };
});

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
  container?: HTMLElement | ShadowRoot | {current: HTMLElement | ShadowRoot | null} | null | undefined;
  children?: any;
  [key: string]: any;
}

export namespace DialogPortal {
  export type State = DialogPortalState;
  export type Props = DialogPortalProps;
}
