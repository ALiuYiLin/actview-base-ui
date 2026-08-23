import { defineComponent, toValue } from 'actview';
import { FloatingPortal } from '@/floating-ui-react';

/** Moves the toast to a different part of the DOM. Renders a `<div>` element. */
export const ToastPortal = defineComponent(function ToastPortal(props: ToastPortal.Props) {
  const children = toValue(props.children);
  return () => <FloatingPortal {...props}>{children}</FloatingPortal>;
});

export interface ToastPortalProps {
  children?: any;
  [key: string]: any;
}

export namespace ToastPortal {
  export type Props = ToastPortalProps;
}
