import { FloatingPortal } from '@/floating-ui-react';

/** Moves the popup to a different part of the DOM. Renders a `<div>` element. */
export function NavigationMenuPortal(props: NavigationMenuPortal.Props) {
  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <FloatingPortal {...props}>{props.children}</FloatingPortal>;
}

export interface NavigationMenuPortalProps {
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuPortal {
  export type Props = NavigationMenuPortalProps;
}