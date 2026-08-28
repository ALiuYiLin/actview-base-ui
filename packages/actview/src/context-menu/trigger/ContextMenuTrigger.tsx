import { computed, onUnmounted, ref, toRefs, watch } from 'actview';
import type { Ref } from 'actview';
import { useTimeout } from '@/utils/useTimeout';
import { ownerDocument } from '@/internals/owner';
import { addEventListener } from '@/internals/addEventListener';
import { contains, getTarget, stopEvent } from '@/floating-ui-react/utils';
import type { BaseUIComponentProps } from '@/internals/types';
import { useContextMenuRootContext } from '../root/ContextMenuRootContext';
import { useMenuRootContext } from '@/menu/root/MenuRootContext';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { pressableTriggerOpenStateMapping } from '@/utils/popupStateMapping';
import { REASONS } from '@/internals/reasons';
import { findRootOwnerId } from '@/menu/utils/findRootOwnerId';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

const LONG_PRESS_DELAY = 500;

/**
 * An area that opens the menu on right click or long press.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Context Menu](https://base-ui.com/react/components/context-menu)
 */
export function ContextMenuTrigger(componentProps: ContextMenuTrigger.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const disabled = computed(() => componentProps.disabled ?? false);

  // context 载体直取（store-as-is）：getter 字段事件期属性访问实时。
  const rootContext = useContextMenuRootContext(false)!;
  const {store} = useMenuRootContext(false);
  const open = store.useState('open');
  const disabledState = store.useState('disabled');

  const triggerRef = ref<HTMLDivElement | null>(null);
  const touchPositionRef = ref<{x: number; y: number} | null>(null);
  const longPressTimeout = useTimeout();
  const allowMouseUpTimeout = useTimeout();
  const allowMouseUpRef = ref(false);
  const mouseUpAbortControllerRef = ref(null as AbortController | null);

  // 事件 handler：setup 闭包读 computed/refs——事件触发时拿到实时值。
  function handleLongPress(x: number, y: number, event: MouseEvent | TouchEvent) {
    const isTouchEvent = event.type.startsWith('touch');

    rootContext.initialCursorPointRef.value = {x, y};

    rootContext.setAnchor({
      getBoundingClientRect() {
        return DOMRect.fromRect({
          width: isTouchEvent ? 10 : 0,
          height: isTouchEvent ? 10 : 0,
          x,
          y,
        });
      },
    });

    allowMouseUpRef.value = false;
    rootContext.actionsRef.value?.setOpen(
      true,
      createChangeEventDetails(REASONS.triggerPress, event),
    );

    allowMouseUpTimeout.start(LONG_PRESS_DELAY, () => {
      allowMouseUpRef.value = true;
    });
  }

  function handleContextMenu(event: any) {
    if (disabled.value || disabledState.value) {
      return;
    }
    rootContext.allowMouseUpTriggerRef.value = true;
    stopEvent(event);
    handleLongPress(event.clientX, event.clientY, event.nativeEvent ?? event);
    const doc = ownerDocument(triggerRef.value);

    // Abort a listener from a previous trigger that never saw its mouseup, and scope this
    // one to a fresh controller so it's removed on unmount if the mouseup never arrives.
    mouseUpAbortControllerRef.value?.abort();
    const mouseUpAbortController = new AbortController();
    mouseUpAbortControllerRef.value = mouseUpAbortController;
    doc.addEventListener(
      'mouseup',
      (mouseEvent: MouseEvent) => {
        rootContext.allowMouseUpTriggerRef.value = false;

        if (!allowMouseUpRef.value) {
          return;
        }

        allowMouseUpTimeout.clear();
        allowMouseUpRef.value = false;

        const mouseUpTarget = getTarget(mouseEvent) as Element | null;

        if (contains(rootContext.positionerRef.value, mouseUpTarget)) {
          return;
        }

        if (
          rootContext.rootId &&
          mouseUpTarget &&
          findRootOwnerId(mouseUpTarget) === rootContext.rootId
        ) {
          return;
        }

        rootContext.actionsRef.value?.setOpen(
          false,
          createChangeEventDetails(REASONS.cancelOpen, mouseEvent),
        );
      },
      {once: true, signal: mouseUpAbortController.signal},
    );
  }

  function cancelLongPress() {
    longPressTimeout.clear();
    touchPositionRef.value = null;
  }

  function handleTouchStart(event: any) {
    if (disabled.value || disabledState.value) {
      cancelLongPress();
      return;
    }
    rootContext.allowMouseUpTriggerRef.value = false;
    if (event.touches.length !== 1) {
      cancelLongPress();
      return;
    }

    event.stopPropagation();
    const touch = event.touches[0];
    const touchPosition = {x: touch.clientX, y: touch.clientY};
    touchPositionRef.value = touchPosition;
    longPressTimeout.start(LONG_PRESS_DELAY, () => {
      handleLongPress(touchPosition.x, touchPosition.y, event.nativeEvent ?? event);
    });
  }

  function handleTouchMove(event: any) {
    if (event.touches.length !== 1) {
      cancelLongPress();
      return;
    }

    if (longPressTimeout.isStarted() && touchPositionRef.value) {
      const touch = event.touches[0];
      const moveThreshold = 10;

      const deltaX = Math.abs(touch.clientX - touchPositionRef.value.x);
      const deltaY = Math.abs(touch.clientY - touchPositionRef.value.y);

      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        cancelLongPress();
      }
    }
  }

  // Abort a pending mouseup listener if the trigger unmounts before it fires.
  onUnmounted(() => {
    mouseUpAbortControllerRef.value?.abort();
  });

  const docContextMenuCleanup = ref<(() => void) | null>(null);

  // Prevent the native context menu from appearing inside the trigger or backdrops.
  watch(
    () => [triggerRef.value, disabled.value, disabledState.value] as const,
    () => {
      docContextMenuCleanup.value?.();
      if (disabled.value || disabledState.value || !triggerRef.value) {
        return;
      }

      const doc = ownerDocument(triggerRef.value);
      const cleanup = addEventListener(doc, 'contextmenu', (event: Event) => {
        const target = getTarget(event) as Element | null;
        if (
          contains(triggerRef.value, target) ||
          contains(rootContext.internalBackdropRef.value, target) ||
          contains(rootContext.backdropRef.value, target)
        ) {
          event.preventDefault();
        }
      });
      docContextMenuCleanup.value = cleanup;
    },
    {flush: 'post', immediate: true},
  );

  onUnmounted(() => {
    docContextMenuCleanup.value?.();
  });

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const state = computed<ContextMenuTriggerState>(() => ({
    open: open.value,
  }));

  // 根元素 props：长按/右键 handler → 透传 → open state data-*。
  const rootProps = computed<Record<string, any>>(() => {
    const merged: any = {
      onContextMenu: handleContextMenu,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: cancelLongPress,
      onTouchCancel: cancelLongPress,
      style: {
        WebkitTouchCallout: 'none',
        ...(style?.value ?? {}),
      },
      ...elementProps.value,
    };

    Object.assign(merged, pressableTriggerOpenStateMapping.open(open.value));
    return merged;
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          ref: useMergedRefs(
            (el: HTMLDivElement | null) => {
              triggerRef.value = el;
            },
            componentProps.ref as any,
          ),
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface ContextMenuTriggerState {
  /**
   * Whether the context menu is currently open.
   */
  open: boolean;
}

export interface ContextMenuTriggerProps extends BaseUIComponentProps<'div', ContextMenuTriggerState> {
  children?: any;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  [key: string]: any;
}

export namespace ContextMenuTrigger {
  export type State = ContextMenuTriggerState;
  export type Props = ContextMenuTriggerProps;
}
