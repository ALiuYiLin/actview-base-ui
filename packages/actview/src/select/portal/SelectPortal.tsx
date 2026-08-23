import { defineComponent, toValue } from 'actview';
import { FloatingPortal } from '@/floating-ui-react';

/** Moves the popup to a different part of the DOM. */
export const SelectPortal = defineComponent(function SelectPortal(props: SelectPortal.Props) {
  const children = toValue(props.children);
  return () => <FloatingPortal {...props}>{children}</FloatingPortal>;
});

export interface SelectPortalProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectPortal {
  export type Props = SelectPortalProps;
}
