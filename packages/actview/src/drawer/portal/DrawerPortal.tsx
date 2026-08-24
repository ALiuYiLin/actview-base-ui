import { defineComponent } from 'actview';
import { FloatingPortal } from '@/floating-ui-react';
import { useDialogRootContext } from '@/dialog/root/DialogRootContext';
import { DrawerPortalContext } from './DrawerPortalContext';
import type { Ref } from 'actview';

/**
 * A portal element that moves the Drawer to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/Drawer)
 */
export const DrawerPortal = defineComponent(function DrawerPortal(props: DrawerPortal.Props) {
  const {keepMounted = false, ...portalProps} = props as any;

  const store = useDialogRootContext(false);
  const mounted = store.useState('mounted');

  return () => {
    const shouldRender = mounted.value || keepMounted;
    if (!shouldRender) {
      return null;
    }

    return (
      <DrawerPortalContext.Provider value={keepMounted}>
        <FloatingPortal {...portalProps} />
      </DrawerPortalContext.Provider>
    );
  };
});

export interface DrawerPortalState {}

export interface DrawerPortalProps {
  /**
   * Whether to keep the portal mounted in the DOM while the Drawer is hidden.
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

export namespace DrawerPortal {
  export type State = DrawerPortalState;
  export type Props = DrawerPortalProps;
}
