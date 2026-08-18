import { computed } from 'actview';
import { createElement } from '@actview/jsx';
import { FloatingPortal } from '../../floating-ui-actview';
import type { BaseUIComponentProps } from '../../internals/types';
import { useMenuRootContext } from '../root/MenuRootContext';
import { MenuPortalContext } from './MenuPortalContext';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuPortal(props: MenuPortal.Props) {
  const { keepMounted = false, ...portalProps } = props;

  const rootContext = useMenuRootContext();
  const { store, parent } = rootContext.value!;
  const mounted = store.useState('mounted');

  const shouldRender = computed(() => mounted.value || keepMounted);

  // The hidden `aria-owns` owner renders here, in the React tree, so the role must be decided by
  // where this portal sits, not by the active trigger. `parent` comes from context (the `Menu.Root`
  // position), unlike the store's `parent`, which a detached trigger overwrites with its own.
  const portalOwnerRole = computed(() => {
    const parentType = parent.type;
    return parentType === 'menu' || parentType === 'menubar' ? 'group' : undefined;
  });

  return (
    <MenuPortalContext.Provider value={computed(() => keepMounted)}>
      {/* The hidden `aria-owns` owner needs `group` only under role-constrained parents. */}
      {shouldRender.value &&
        createElement(FloatingPortal, { ...portalProps, portalOwnerRole: portalOwnerRole.value })}
    </MenuPortalContext.Provider>
  );
}

export interface MenuPortalState {}

export interface MenuPortalProps extends BaseUIComponentProps<'div', MenuPortalState> {
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

export namespace MenuPortal {
  export type State = MenuPortalState;
  export type Props = MenuPortalProps;
}
