import { defineComponent, toValue } from 'actview';
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
export const MenuPortal = defineComponent(function MenuPortal(props: MenuPortal.Props) {
  const {store, parent} = useMenuRootContext();
  const mounted = store.useState('mounted');

  const portalOwnerRole =
    parent.type === 'menu' || parent.type === 'menubar' ? 'group' : undefined;

  return () => {
    // PD-15：props（含 children）必须在 render 期展开——setup 快照会让
    // 动态 children（payload 驱动的 viewport 内容）永远停留首次渲染。
    const {keepMounted = false, ...portalProps} = props;

    const shouldRender = mounted.value || keepMounted;
    if (!shouldRender) {
      return null;
    }

    return (
      <MenuPortalContext.Provider value={keepMounted}>
        <FloatingPortal {...(portalProps as any)} portalOwnerRole={portalOwnerRole} />
      </MenuPortalContext.Provider>
    );
  };
});

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
