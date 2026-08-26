import { createContext, defineComponent, onUnmounted, ref, toValue, watch } from 'actview';
import { addEventListener } from '@/internals/addEventListener';
import { mergeCleanups } from '@/internals/mergeCleanups';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { FocusGuard } from '@/utils/FocusGuard';
import {
  enableFocusInside,
  disableFocusInside,
  getPreviousTabbable,
  getNextTabbable,
  isOutsideEvent,
} from '../utils/tabbable';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { createAttribute } from '../utils/createAttribute';

type FocusManagerState = null | {
  modal: boolean;
  open: boolean;
  onOpenChange(
    open: boolean,
    data?: {reason?: string | undefined; event?: Event | undefined},
  ): void;
  domReference: Element | null;
  closeOnFocusOut: boolean;
};

export type PortalContextValue = {
  portalNode: HTMLElement | null;
  setFocusManagerState: (value: FocusManagerState | ((prev: FocusManagerState) => FocusManagerState)) => void;
  beforeInsideRef: {value: HTMLSpanElement | null};
  afterInsideRef: {value: HTMLSpanElement | null};
  beforeOutsideRef: {value: HTMLSpanElement | null};
  afterOutsideRef: {value: HTMLSpanElement | null};
};

export const FloatingPortalContext = createContext<PortalContextValue | undefined>(undefined);

export const usePortalContext = () => FloatingPortalContext.use();

const attr = createAttribute('portal');

const visuallyHiddenStyle = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: '0',
  border: '0',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
} as const;

/**
 * Portals the floating element into a given container element — by default,
 * outside of the app root and into the body.
 * @see https://floating-ui.com/docs/FloatingPortal
 * (actview 版：Teleport 代替 createPortal；原生 DOM 事件。)
 */
export const FloatingPortal = defineComponent(function FloatingPortal(
  componentProps: FloatingPortal.Props<any>,
) {
  const {render, className, style, container, portalOwnerRole} = componentProps;

  const portalNode = ref<HTMLElement | null>(null);
  const portalNodeId = useBaseUiId();

  const beforeOutsideRef = ref(null as HTMLSpanElement | null);
  const afterOutsideRef = ref(null as HTMLSpanElement | null);
  const beforeInsideRef = ref(null as HTMLSpanElement | null);
  const afterInsideRef = ref(null as HTMLSpanElement | null);

  const focusManagerState = ref<FocusManagerState>(null);
  const focusInsideDisabledRef = ref(false);

  // Create the portal node and append it to the resolved container.
  watch(
    () => container,
    () => {
      if (portalNode.value) {
        return;
      }

      const containerProp = toValue(container);
      const resolvedContainer =
        (containerProp && (containerProp as any).nodeType != null
          ? containerProp
          : (containerProp as any)?.value) ??
        document.body;

      if (resolvedContainer == null) {
        return;
      }

      const node = document.createElement('div');
      node.id = portalNodeId ?? '';
      node.setAttribute(attr, '');
      resolvedContainer.appendChild(node);
      portalNode.value = node;
    },
    {flush: 'post', immediate: true},
  );

  onUnmounted(() => {
    portalNode.value?.remove();
    portalNode.value = null;
  });

  const modal = () => focusManagerState.value?.modal;
  const open = () => focusManagerState.value?.open;
  const shouldRenderGuards = () =>
    !!focusManagerState.value &&
    !focusManagerState.value.modal &&
    focusManagerState.value.open &&
    !!portalNode.value;

  // https://codesandbox.io/s/tabbable-portal-f4tng?file=/src/TabbablePortal.tsx
  watch(
    () => [portalNode.value, modal()] as const,
    () => {
      if (!portalNode.value || modal()) {
        return undefined;
      }

      // Make sure elements inside the portal element are tabbable only when the
      // portal has already been focused.
      function onFocus(event: FocusEvent) {
        if (portalNode.value && event.relatedTarget && isOutsideEvent(event)) {
          if (event.type === 'focusin') {
            if (focusInsideDisabledRef.value) {
              enableFocusInside(portalNode.value);
              focusInsideDisabledRef.value = false;
            }
          } else {
            disableFocusInside(portalNode.value);
            focusInsideDisabledRef.value = true;
          }
        }
      }

      return mergeCleanups(
        addEventListener(portalNode.value, 'focusin', onFocus, true),
        addEventListener(portalNode.value, 'focusout', onFocus, true),
      );
    },
    {flush: 'post', immediate: true},
  );

  watch(
    () => [open(), portalNode.value] as const,
    () => {
      if (!portalNode.value || open() !== true || !focusInsideDisabledRef.value) {
        return;
      }

      // Restore tabbability before the focus manager's queued focus-on-open step runs.
      enableFocusInside(portalNode.value);
      focusInsideDisabledRef.value = false;
    },
    {flush: 'post', immediate: true},
  );

  const portalContextValue: PortalContextValue = {
    beforeOutsideRef,
    afterOutsideRef,
    beforeInsideRef,
    afterInsideRef,
    portalNode: portalNode.value,
    setFocusManagerState: (value) => {
      focusManagerState.value =
        typeof value === 'function' ? (value as any)(focusManagerState.value) : value;
    },
  };

  return () => {
    const {children, ...elementProps} = componentProps as any;
    const showGuards = shouldRenderGuards();
    const node = portalNode.value;

    const provider = (
      <FloatingPortalContext.Provider value={portalContextValue}>
        {showGuards && node && (
          <FocusGuard
            data-type="outside"
            ref={(el: any) => (beforeOutsideRef.value = el)}
            onFocus={(event: any) => {
              if (isOutsideEvent(event, node)) {
                beforeInsideRef.value?.focus();
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
        {showGuards && node && (
          <span
            role={portalOwnerRole}
            aria-owns={portalNodeId}
            style={visuallyHiddenStyle as any}
          />
        )}
        {showGuards && node && (
          <FocusGuard
            data-type="outside"
            ref={(el: any) => (afterOutsideRef.value = el)}
            onFocus={(event: any) => {
              if (isOutsideEvent(event, node)) {
                afterInsideRef.value?.focus();
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
      </FloatingPortalContext.Provider>
    );

    if (!node) {
      return provider;
    }

    return (
      <>
        <TeleportContainer node={node}>{children}</TeleportContainer>
        {provider}
      </>
    );
  };
});

import { Teleport } from 'actview';
import type { Ref } from 'actview';

function TeleportContainer(props: {node: HTMLElement; children: any}) {
  return () => <Teleport mount={props.node}>{props.children}</Teleport>;
}

export interface FloatingPortalState {}

export namespace FloatingPortal {
  export type State = FloatingPortalState;
  export interface Props<TState> {
    /**
     * A parent element to render the portal element into.
     */
    container?: HTMLElement | ShadowRoot | null | Ref<HTMLElement | ShadowRoot | null> | undefined;
    /**
     * @ignore
     * The role for the hidden `aria-owns` owner element.
     */
    portalOwnerRole?: string | undefined;
    children?: any;
    [key: string]: any;
  }
}

