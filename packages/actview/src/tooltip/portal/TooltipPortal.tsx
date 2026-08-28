import { computed } from 'actview';
import type { Ref } from 'actview';
import { FloatingPortal } from '@/floating-ui-react';
import { useTooltipRootContext } from '../root/TooltipRootContext';
import { TooltipPortalContext } from './TooltipPortalContext';

/**
 * A portal element that moves the tooltip to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tooltip](https://base-ui.com/react/components/tooltip)
 */
export function TooltipPortal(props: TooltipPortal.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：store 的 useState 字段渲染期 `.value` 求值。
  const store = useTooltipRootContext(false);
  const mounted = store.useState('mounted');

  // 渲染期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const keepMounted = computed(() => props.keepMounted ?? false);

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 条件在渲染期求值（表达式内 .value 直读，无 IIFE）；其余 portalProps
  // 透传 FloatingPortal。
  return (
    <>
      {mounted.value || keepMounted.value ? (
        <TooltipPortalContext.Provider value={keepMounted.value}>
          <FloatingPortal {...props} keepMounted={keepMounted.value} />
        </TooltipPortalContext.Provider>
      ) : null}
    </>
  );
}

export interface TooltipPortalState {}

export interface TooltipPortalProps {
  /**
   * Whether to keep the portal mounted in the DOM while the tooltip is hidden.
   * @default false
   */
  keepMounted?: boolean | undefined;
  /**
   * A parent element to render the portal element into.
   */
  container?: HTMLElement | ShadowRoot | Ref<HTMLElement | ShadowRoot | null> | null | undefined;
  children?: any;
  [key: string]: any;
}

export namespace TooltipPortal {
  export type State = TooltipPortalState;
  export type Props = TooltipPortalProps;
}
