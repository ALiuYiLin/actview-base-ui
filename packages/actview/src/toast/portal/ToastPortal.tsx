import { FloatingPortal } from '@/floating-ui-react';

/** Moves the toast to a different part of the DOM. Renders a `<div>` element. */
export function ToastPortal(props: ToastPortal.Props) {
  return <FloatingPortal {...props}>{props.children}</FloatingPortal>;
}

export interface ToastPortalProps {
  children?: any;
  [key: string]: any;
}

export namespace ToastPortal {
  export type Props = ToastPortalProps;
}
