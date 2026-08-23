import { defineComponent, toValue } from 'actview';
import { FloatingPortal } from '@/floating-ui-react';

/** Moves the popup to a different part of the DOM. */
export const ComboboxPortal = defineComponent(function ComboboxPortal(props: ComboboxPortal.Props) {
  const children = toValue(props.children);
  return () => <FloatingPortal {...props}>{children}</FloatingPortal>;
});

export interface ComboboxPortalProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxPortal {
  export type Props = ComboboxPortalProps;
}
