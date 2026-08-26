import { FloatingPortal } from '@/floating-ui-react';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { PopoverPortalContext } from './PopoverPortalContext';
import type { Ref } from 'actview';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverPortal(props: PopoverPortal.Props) {
  // ============ setup（只执行一次） ============
  const store = usePopoverRootContext(false);
  const mounted = store.useState('mounted');

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // PD-15：props 在 render 期读取（代理 spread/属性读）——setup 快照会让
  // render prop 重建的 children（Positioner vnode 树）永远停留首次渲染。
  return (
    <PopoverPortalContext.Provider value={props.keepMounted ?? false}>
      {mounted.value || props.keepMounted ? (
        <FloatingPortal {...(props as any)} />
      ) : null}
    </PopoverPortalContext.Provider>
  );
}

export interface PopoverPortalState {}

export interface PopoverPortalProps {
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

export namespace PopoverPortal {
  export type State = PopoverPortalState;
  export type Props = PopoverPortalProps;
}
