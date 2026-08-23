import { defineComponent, toValue } from 'actview';
import { FloatingPortal } from '@/floating-ui-react';

/** Moves the popup to a different part of the DOM. Renders a `<div>` element. */
export const NavigationMenuPortal = defineComponent(function NavigationMenuPortal(
  props: NavigationMenuPortal.Props,
) {
  const children = toValue(props.children);
  return () => <FloatingPortal {...props}>{children}</FloatingPortal>;
});

export interface NavigationMenuPortalProps {
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuPortal {
  export type Props = NavigationMenuPortalProps;
}
