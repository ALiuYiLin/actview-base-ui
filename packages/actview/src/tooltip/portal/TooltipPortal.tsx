import { FloatingPortal } from '@/floating-ui-react';
import { useTooltipRootContext } from '../root/TooltipRootContext';
import { TooltipPortalContext } from './TooltipPortalContext';
import type { Ref } from 'actview';

/**
 * A portal element that moves the tooltip to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tooltip](https://base-ui.com/react/components/tooltip)
 */
export function TooltipPortal(props: TooltipPortal.Props) {
  const store = useTooltipRootContext(false);
  const mounted = store.useState('mounted');

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // props（keepMounted/portalProps）渲染期读取（PD-15）
  return (
    <>
      {(() => {
        const {keepMounted = false, ...portalProps} = props as any;
        const shouldRender = mounted.value || keepMounted;
        if (!shouldRender) {
          return null;
        }

        return (
          <TooltipPortalContext.Provider value={keepMounted}>
            <FloatingPortal {...portalProps} />
          </TooltipPortalContext.Provider>
        );
      })()}
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
