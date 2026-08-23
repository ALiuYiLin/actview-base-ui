import { defineComponent, toValue } from 'actview';
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
export const TooltipPortal = defineComponent(function TooltipPortal(
  props: TooltipPortal.Props,
) {
  const {keepMounted = false, ...portalProps} = props as any;

  const store = useTooltipRootContext(false);
  const mounted = store.useState('mounted');

  return () => {
    const shouldRender = mounted.value || keepMounted;
    if (!shouldRender) {
      return null;
    }

    return (
      <TooltipPortalContext.Provider value={keepMounted}>
        <FloatingPortal {...portalProps} />
      </TooltipPortalContext.Provider>
    );
  };
});

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
  container?: HTMLElement | ShadowRoot | {current: HTMLElement | ShadowRoot | null} | null | undefined;
  children?: any;
  [key: string]: any;
}

export namespace TooltipPortal {
  export type State = TooltipPortalState;
  export type Props = TooltipPortalProps;
}
