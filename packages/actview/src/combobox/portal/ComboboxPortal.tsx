import { computed, defineComponent } from 'actview';
import { createElement } from '@actview/jsx';
import { FloatingPortal } from '@/floating-ui-actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useComboboxRootContext } from '@/combobox/root/ComboboxRootContext';
import { ComboboxPortalContext } from '@/combobox/portal/ComboboxPortalContext';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export const ComboboxPortal = defineComponent(function (props: ComboboxPortal.Props) {
  // ================= setup（只执行一次） =================
  const store = useComboboxRootContext();

  const mounted = store.useState('mounted');
  const forceMounted = store.useState('forceMounted');

  const shouldRender = computed(() => mounted.value || props.keepMounted || forceMounted.value);

  // ================= render（每次更新执行） =================
  return () => {
    const { keepMounted = false, ...portalProps } = props;

    return (
      <ComboboxPortalContext.Provider value={keepMounted}>
        {shouldRender.value &&
          createElement(FloatingPortal, { ...portalProps })}
      </ComboboxPortalContext.Provider>
    );
  };
}) as (props: ComboboxPortal.Props) => any;

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