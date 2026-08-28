import { computed } from 'actview';
import type { Ref } from 'actview';
import { FloatingPortal } from '@/floating-ui-react';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { PopoverPortalContext } from './PopoverPortalContext';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverPortal(props: PopoverPortal.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：store 的 useState 字段渲染期 `.value` 求值。
  const store = usePopoverRootContext(false)!;
  const mounted = store.useState('mounted');

  // 渲染期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const keepMounted = computed(() => props.keepMounted ?? false);

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 条件在渲染期求值（表达式内 .value 直读，无 IIFE）。
  return (
    <PopoverPortalContext.Provider value={keepMounted.value}>
      {mounted.value || keepMounted.value ? <FloatingPortal {...(props as any)} /> : null}
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
