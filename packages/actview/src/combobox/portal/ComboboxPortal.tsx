import { FloatingPortal } from '@/floating-ui-react';

/** Moves the popup to a different part of the DOM. */
export function ComboboxPortal(props: ComboboxPortal.Props) {
  return <FloatingPortal {...props}>{props.children}</FloatingPortal>;
}

export interface ComboboxPortalProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxPortal {
  export type Props = ComboboxPortalProps;
}
