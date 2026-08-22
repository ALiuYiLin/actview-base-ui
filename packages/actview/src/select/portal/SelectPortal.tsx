import { computed } from 'actview';
import { createElement } from '@actview/jsx';
import { FloatingPortal } from '@/floating-ui-actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useSelectRootContext } from '@/select/root/SelectRootContext';
import { selectors } from '@/select/store';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectPortal(portalProps: SelectPortal.Props) {
  const rootContext = useSelectRootContext().value!;
  const { store } = rootContext;
  const mounted = store.useState('mounted');
  const forceMount = store.useState('forceMount');

  const shouldRender = computed(() => mounted.value || forceMount.value);

  return (
    <>
      {shouldRender.value && createElement(FloatingPortal, portalProps)}
    </>
  );
}

export interface SelectPortalState {}

export interface SelectPortalProps extends BaseUIComponentProps<'div', SelectPortalState> {
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

export namespace SelectPortal {
  export type State = SelectPortalState;
  export type Props = SelectPortalProps;
}
