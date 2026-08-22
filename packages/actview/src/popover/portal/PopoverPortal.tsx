import { computed } from 'actview';
import { createElement } from '@actview/jsx';
import { FloatingPortal } from '@/floating-ui-actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { usePopoverRootContext } from '@/popover/root/PopoverRootContext';
import { PopoverPortalContext } from '@/popover/portal/PopoverPortalContext';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverPortal(componentProps: PopoverPortal.Props) {
  const { keepMounted = false, ...portalProps } = componentProps;

  const store = usePopoverRootContext().value!;
  const mounted = store.useState('mounted');

  const shouldRender = computed(() => mounted.value || keepMounted);

  return (
    <>
      {shouldRender.value && (
        <PopoverPortalContext.Provider value={keepMounted}>
          {createElement(FloatingPortal, portalProps)}
        </PopoverPortalContext.Provider>
      )}
    </>
  );
}

export interface PopoverPortalState {}

export interface PopoverPortalProps extends BaseUIComponentProps<'div', PopoverPortalState> {
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
    | { current?: HTMLElement | ShadowRoot | null; value?: HTMLElement | ShadowRoot | null }
    | null
    | undefined;
}

export namespace PopoverPortal {
  export type State = PopoverPortalState;
  export type Props = PopoverPortalProps;
}
