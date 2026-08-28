import { createContext, computed, onUnmounted, ref, watch, Teleport } from 'actview';
import type { Ref } from 'actview';
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
export function FloatingPortal(componentProps: FloatingPortal.Props<any>) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const portalNode = ref<HTMLElement | null>(null);
  const portalNodeId = useBaseUiId();

  const beforeOutsideRef = ref(null as HTMLSpanElement | null);
  const afterOutsideRef = ref(null as HTMLSpanElement | null);
  const beforeInsideRef = ref(null as HTMLSpanElement | null);
  const afterInsideRef = ref(null as HTMLSpanElement | null);

  const focusManagerState = ref<FocusManagerState>(null);
  const focusInsideDisabledRef = ref(false);

  // 渲染期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const portalOwnerRole = computed(() => componentProps.portalOwnerRole);

  // Create the portal node and append it to the resolved container.
  // 手动解两层（对齐 React 版 `containerProp.current ?? document.body`）：
  // container 可能是 rawRef 包的用户 ref——先取 prop 本体（watch 源读
  // componentProps.container 追踪 prop 变化），再读其 `.value` 追踪容器元素
  // 挂载，挂载后 watch 重跑并迁移节点。
  watch(
    () => {
      const containerProp = componentProps.container as any;
      const resolvedContainer =
        (containerProp && containerProp.nodeType != null
          ? containerProp
          : containerProp?.value) ?? document.body;
      return resolvedContainer;
    },
    (resolvedContainer) => {
      if (resolvedContainer == null) {
        return;
      }

      if (!portalNode.value) {
        const node = document.createElement('div');
        node.id = portalNodeId ?? '';
        node.setAttribute(attr, '');
        resolvedContainer.appendChild(node);
        portalNode.value = node;
      } else if (portalNode.value.parentElement !== resolvedContainer) {
        // 容器变化（如 ref 容器挂载后）：迁移已有节点（保持 id/attr，
        // Teleport 内容随节点移动）。
        resolvedContainer.appendChild(portalNode.value);
      }
    },
    {flush: 'post', immediate: true},
  );

  onUnmounted(() => {
    portalNode.value?.remove();
    portalNode.value = null;
  });

  // 事件期/渲染期求值的 getter（focusManagerState 经 setFocusManagerState 写入）。
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

  // store-as-is 载体：身份稳定的 getter 对象——portalNode 渲染期求值
  // （setup 快照会停留在首渲染的 null）。
  const portalContextValue: PortalContextValue = {
    get portalNode() {
      return portalNode.value;
    },
    setFocusManagerState: (value) => {
      focusManagerState.value =
        typeof value === 'function' ? (value as any)(focusManagerState.value) : value;
    },
    beforeOutsideRef,
    afterOutsideRef,
    beforeInsideRef,
    afterInsideRef,
  };

  // 事件 handler：setup 闭包（guards 的 onFocus 逻辑）。
  const handleBeforeOutsideFocus = (event: any) => {
    const node = portalNode.value;
    if (isOutsideEvent(event, node ?? undefined)) {
      beforeInsideRef.value?.focus();
    } else {
      const domReference = focusManagerState.value
        ? focusManagerState.value.domReference
        : null;
      const prevTabbable = getPreviousTabbable(domReference);
      prevTabbable?.focus();
    }
  };

  const handleAfterOutsideFocus = (event: any) => {
    const node = portalNode.value;
    if (isOutsideEvent(event, node ?? undefined)) {
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
  };

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // 条件在渲染期求值（表达式内 .value 直读，无 IIFE）。
  return (
    <>
      {portalNode.value != null && (
        <Teleport to={portalNode.value}>{componentProps.children}</Teleport>
      )}
      <FloatingPortalContext.Provider value={portalContextValue}>
        {shouldRenderGuards() && portalNode.value && (
          <FocusGuard
            data-type="outside"
            ref={(el: any) => (beforeOutsideRef.value = el)}
            onFocus={handleBeforeOutsideFocus}
          />
        )}
        {shouldRenderGuards() && portalNode.value && (
          <span
            role={portalOwnerRole.value}
            aria-owns={portalNodeId}
            style={visuallyHiddenStyle as any}
          />
        )}
        {shouldRenderGuards() && portalNode.value && (
          <FocusGuard
            data-type="outside"
            ref={(el: any) => (afterOutsideRef.value = el)}
            onFocus={handleAfterOutsideFocus}
          />
        )}
      </FloatingPortalContext.Provider>
    </>
  );
}

export interface FloatingPortalState {}

export namespace FloatingPortal {
  export type State = FloatingPortalState;
  export interface Props<TState> {
    /**
     * A parent element to render the portal element into.
     * 传 ref 需用 `rawRef(ref)`（actview JSX 层默认解包 Ref prop 为静态值，
     * rawRef 标记跳过解包，组件收到 ref 对象本体并追踪其 `.value`）。
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
