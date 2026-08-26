import { FloatingPortal } from '@/floating-ui-react';
import { useMenuRootContext } from '../root/MenuRootContext';
import { MenuPortalContext } from './MenuPortalContext';
import type { Ref } from 'actview';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuPortal(props: MenuPortal.Props) {
  // ============ setup（只执行一次） ============
  const {store, parent} = useMenuRootContext();
  const mounted = store.useState('mounted');

  const portalOwnerRole =
    parent.type === 'menu' || parent.type === 'menubar' ? 'group' : undefined;

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // PD-15：props（含 children）渲染期展开——动态 children（payload 驱动的
  // viewport 内容）不停留首次渲染。
  return (
    <MenuPortalContext.Provider value={props.keepMounted ?? false}>
      {!mounted.value && !props.keepMounted ? null : (
        <FloatingPortal {...(props as any)} portalOwnerRole={portalOwnerRole} />
      )}
    </MenuPortalContext.Provider>
  );
}

export interface MenuPortalState {}

export interface MenuPortalProps {
  /**
   * Whether to keep the portal mounted in the DOM while the popup is hidden.
   * @default false
   */
  keepMounted?: boolean | undefined;
  /**
   * A parent element to render the portal element into.
   */
  container?:
    | HTMLElement
    | ShadowRoot
    | Ref<HTMLElement | ShadowRoot | null>
    | null
    | undefined;
  children?: any;
  [key: string]: any;
}

export namespace MenuPortal {
  export type State = MenuPortalState;
  export type Props = MenuPortalProps;
}
