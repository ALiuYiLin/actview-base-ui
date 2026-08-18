import { computed } from 'actview';
import { createElement } from '@actview/jsx';
import { FloatingPortal } from '../../floating-ui-actview';
import type { BaseUIComponentProps } from '../../internals/types';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { ComboboxPortalContext } from './ComboboxPortalContext';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxPortal(props: ComboboxPortal.Props) {
  const { keepMounted = false, ...portalProps } = props;

  const store = useComboboxRootContext();

  const mounted = store.useState('mounted');
  const forceMounted = store.useState('forceMounted');

  const shouldRender = computed(() => mounted.value || keepMounted || forceMounted.value);

  return (
    <ComboboxPortalContext.Provider value={computed(() => keepMounted)}>
      {/* Setup runs once in ActView, so the conditional render must live in JSX (menu pattern). */}
      {shouldRender.value &&
        createElement(FloatingPortal, { ...portalProps })}
    </ComboboxPortalContext.Provider>
  );
}

export interface ComboboxPortalState {}

export interface ComboboxPortalProps extends BaseUIComponentProps<'div', ComboboxPortalState> {
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

export namespace ComboboxPortal {
  export type State = ComboboxPortalState;
  export type Props = ComboboxPortalProps;
}
