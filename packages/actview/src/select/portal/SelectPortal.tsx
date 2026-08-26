import { FloatingPortal } from '@/floating-ui-react';

/** Moves the popup to a different part of the DOM. */
export function SelectPortal(props: SelectPortal.Props) {
  return <FloatingPortal {...props}>{props.children}</FloatingPortal>;
}

export interface SelectPortalProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectPortal {
  export type Props = SelectPortalProps;
}
