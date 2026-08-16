import { computed, ref, watch, Teleport } from 'actview';
import type { ComputedRef, Ref } from '@actview/core';
import type { VNode, VNodeChild } from '@actview/jsx';
import { isValidElement } from '@actview/jsx';
import { isNode } from '@floating-ui/utils/dom';
import { addEventListener } from '@base-ui/actview-utils/addEventListener';
import { mergeCleanups } from '@base-ui/actview-utils/mergeCleanups';
import { useId } from '@base-ui/actview-utils/useId';
import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import { FocusGuard } from '../../utils/FocusGuard';
import {
  enableFocusInside,
  disableFocusInside,
  getPreviousTabbable,
  getNextTabbable,
  isOutsideEvent,
} from '../utils/tabbable';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { createAttribute } from '../utils/createAttribute';
import {
  useRenderElement,
  type UseRenderElementComponentProps,
} from '../../internals/useRenderElement';
import { ownerVisuallyHidden } from '../../internals/constants';
import { createContext } from '../../internals/createContext';
import type { HTMLProps, RefValue, ComponentRenderFn } from '../../types';
import type { StyleValue } from '../../internals/types';

type FocusManagerState = null | {
  modal: boolean;
  open: boolean;
  onOpenChange(
    open: boolean,
    data?: { reason?: string | undefined; event?: Event | undefined },
  ): void;
  domReference: Element | null;
  closeOnFocusOut: boolean;
};

interface PortalContextValue {
  portalNode: HTMLElement | null;
  setFocusManagerState: (state: FocusManagerState) => void;
  beforeInsideRef: { current: HTMLSpanElement | null };
  afterInsideRef: { current: HTMLSpanElement | null };
  beforeOutsideRef: { current: HTMLSpanElement | null };
  afterOutsideRef: { current: HTMLSpanElement | null };
}

const PortalContext = createContext<PortalContextValue | null>(
  'base-ui-floating-portal-context',
  null,
);

export const usePortalContext = () => PortalContext.use().value;

const attr = createAttribute('portal');

export interface UseFloatingPortalNodeProps {
  ref?: RefValue<HTMLDivElement> | undefined;
  container?:
    | HTMLElement
    | ShadowRoot
    | null
    | { current: HTMLElement | ShadowRoot | null }
    | undefined;
  componentProps?: UseRenderElementComponentProps<any> | undefined;
  elementProps?: HTMLProps | undefined;
}

export interface UseFloatingPortalNodeResult {
  node: Ref<HTMLElement | null>;
  /**
   * The `id` attribute of the portal node.
   */
  nodeId: ComputedRef<string | undefined>;
  subtree: ComputedRef<VNode | null>;
}

export function useFloatingPortalNode(
  props: UseFloatingPortalNodeProps = {},
): UseFloatingPortalNodeResult {
  const { ref: refProp, container: containerProp, componentProps = EMPTY_OBJECT, elementProps } =
    props;

  const uniqueId = useId();
  const portalContext = usePortalContext();
  const parentPortalNode = portalContext?.portalNode ?? null;

  const containerElement = ref<HTMLElement | ShadowRoot | null>(null);
  const portalNode = ref<HTMLElement | null>(null);

  const setPortalNodeRef = (node: HTMLElement | null) => {
    if (node !== null) {
      // the watch below watching containerProp / parentPortalNode
      // sets portalNode(null) when the container becomes null or changes.
      // So even though the ref callback now ignores null, the portal node still gets cleared.
      portalNode.value = node;
    }
  };

  const containerRef = { current: null as HTMLElement | ShadowRoot | null };

  watch(
    () => [containerProp, parentPortalNode],
    ([containerValue, parentNode]) => {
      // Wait for the container to be resolved if explicitly `null`.
      if (containerValue === null) {
        if (containerRef.current) {
          containerRef.current = null;
          portalNode.value = null;
          containerElement.value = null;
        }
        return;
      }

      const resolvedContainer =
        (containerValue && (isNode(containerValue) ? containerValue : containerValue.current)) ??
        parentNode ??
        document.body;

      if (resolvedContainer == null) {
        if (containerRef.current) {
          containerRef.current = null;
          portalNode.value = null;
          containerElement.value = null;
        }
        return;
      }

      if (containerRef.current !== resolvedContainer) {
        containerRef.current = resolvedContainer;
        portalNode.value = null;
        containerElement.value = resolvedContainer;
      }
    },
    { immediate: true },
  );

  const portalElement = useRenderElement('div', componentProps, {
    ref: [refProp, setPortalNodeRef],
    props: [
      {
        id: uniqueId,
        [attr]: '',
      } as HTMLProps,
      elementProps,
    ],
  });

  // This `Teleport` call injects `portalElement` into the `container`.
  // Another call inside `FloatingPortal`/`FloatingPortalLite` then injects the children into `portalElement`.
  const portalSubtree = computed<VNode | null>(() => {
    const container = containerElement.value;
    return container ? <Teleport to={container}>{portalElement()}</Teleport> : null;
  });

  return {
    node: portalNode,
    // `id` and `render` props can override or remove the generated ID. Use the exact
    // rendered value so `aria-owns` never points at an ID absent from the DOM.
    nodeId: computed<string | undefined>(() => {
      const element = portalElement();
      if (element == null || !isValidElement(element) || element.props == null) {
        return undefined;
      }
      return (element.props as { id?: string | undefined }).id;
    }),
    subtree: portalSubtree,
  };
}

/**
 * Portals the floating element into a given container element — by default,
 * outside of the app root and into the body.
 * This is necessary to ensure the floating element can appear outside any
 * potential parent containers that cause clipping (such as `overflow: hidden`),
 * while retaining its location in the React tree.
 * @see https://floating-ui.com/docs/FloatingPortal
 * @internal
 */
export function FloatingPortal(componentProps: FloatingPortal.Props<any>) {
  const { render, className, style, children, container, portalOwnerRole, ...elementProps } =
    componentProps;

  const {
    node: portalNode,
    nodeId: portalNodeId,
    subtree: portalSubtree,
  } = useFloatingPortalNode({
    container,
    ref: componentProps.ref,
    componentProps,
    elementProps,
  });

  const beforeOutsideRef = { current: null as HTMLSpanElement | null };
  const afterOutsideRef = { current: null as HTMLSpanElement | null };
  const beforeInsideRef = { current: null as HTMLSpanElement | null };
  const afterInsideRef = { current: null as HTMLSpanElement | null };

  const focusManagerState = ref<FocusManagerState>(null);
  const focusInsideDisabledRef = { current: false };

  // https://codesandbox.io/s/tabbable-portal-f4tng?file=/src/TabbablePortal.tsx
  watch(
    [portalNode, () => focusManagerState.value?.modal],
    ([portalNodeValue, modal]: [HTMLElement | null, boolean | undefined]) => {
      if (!portalNodeValue || modal) {
        return;
      }

      // Make sure elements inside the portal element are tabbable only when the
      // portal has already been focused, either by tabbing into a focus trap
      // element outside or using the mouse.
      function onFocus(event: FocusEvent) {
        if (portalNodeValue && event.relatedTarget && isOutsideEvent(event)) {
          if (event.type === 'focusin') {
            if (focusInsideDisabledRef.current) {
              enableFocusInside(portalNodeValue);
              focusInsideDisabledRef.current = false;
            }
          } else {
            disableFocusInside(portalNodeValue);
            focusInsideDisabledRef.current = true;
          }
        }
      }

      // Listen to the event on the capture phase so they run before the focus
      // trap elements onFocus prop is called.
      return mergeCleanups(
        addEventListener(portalNodeValue, 'focusin', onFocus, true),
        addEventListener(portalNodeValue, 'focusout', onFocus, true),
      );
    },
  );

  watch(
    [portalNode, () => focusManagerState.value?.open],
    ([portalNodeValue, openValue]) => {
      if (!portalNodeValue || openValue !== true || !focusInsideDisabledRef.current) {
        return;
      }

      // Restore tabbability before the focus manager's queued focus-on-open step runs.
      enableFocusInside(portalNodeValue);
      focusInsideDisabledRef.current = false;
    },
  );

  const setFocusManagerState = (state: FocusManagerState) => {
    focusManagerState.value = state;
  };

  const portalContextValue = computed<PortalContextValue>(() => ({
    beforeOutsideRef,
    afterOutsideRef,
    beforeInsideRef,
    afterInsideRef,
    portalNode: portalNode.value,
    setFocusManagerState,
  }));

  const shouldRenderGuards =
    !!focusManagerState.value &&
    !focusManagerState.value.modal &&
    focusManagerState.value.open &&
    !!portalNode.value;

  return (
    <>
      {portalSubtree.value}
      <PortalContext.Provider value={portalContextValue}>
        {shouldRenderGuards && portalNode.value && (
          <FocusGuard
            data-type="outside"
            ref={beforeOutsideRef}
            onFocus={(event) => {
              if (isOutsideEvent(event, portalNode.value!)) {
                beforeInsideRef.current?.focus();
              } else {
                const domReference = focusManagerState.value
                  ? focusManagerState.value.domReference
                  : null;
                const prevTabbable = getPreviousTabbable(domReference);
                prevTabbable?.focus();
              }
            }}
          />
        )}
        {shouldRenderGuards && portalNode.value && (
          <span role={portalOwnerRole} aria-owns={portalNodeId.value} style={ownerVisuallyHidden} />
        )}
        {portalNode.value && <Teleport to={portalNode.value}>{children}</Teleport>}
        {shouldRenderGuards && portalNode.value && (
          <FocusGuard
            data-type="outside"
            ref={afterOutsideRef}
            onFocus={(event) => {
              if (isOutsideEvent(event, portalNode.value!)) {
                afterInsideRef.current?.focus();
              } else {
                const domReference = focusManagerState.value
                  ? focusManagerState.value.domReference
                  : null;
                const nextTabbable = getNextTabbable(domReference);
                nextTabbable?.focus();

                if (focusManagerState.value?.closeOnFocusOut) {
                  focusManagerState.value?.onOpenChange(
                    false,
                    createChangeEventDetails(REASONS.focusOut, event),
                  );
                }
              }
            }}
          />
        )}
      </PortalContext.Provider>
    </>
  );
}

export interface FloatingPortalState {}

export namespace FloatingPortal {
  export type State = FloatingPortalState;
  export interface Props<TState> {
    children?: VNodeChild;
    className?: string | ((state: TState) => string | undefined) | undefined;
    render?: VNode | ComponentRenderFn<HTMLProps, TState> | undefined;
    style?: StyleValue | ((state: TState) => StyleValue | undefined) | undefined;
    ref?: RefValue<HTMLDivElement> | undefined;
    /**
     * A parent element to render the portal element into.
     */
    container?: UseFloatingPortalNodeProps['container'] | undefined;
    /**
     * @ignore
     * The role for the hidden `aria-owns` owner element.
     */
    portalOwnerRole?: string | undefined;
    [key: string]: any;
  }
}
