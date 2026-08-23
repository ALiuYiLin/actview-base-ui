import { defineComponent, onUnmounted, ref, toValue, watch } from 'actview';
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

const LONG_PRESS_DELAY = 500;

/**
 * An area that opens the menu on right click or long press.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Context Menu](https://base-ui.com/react/components/context-menu)
 */
export const ContextMenuTrigger = defineComponent(function ContextMenuTrigger(
  componentProps: ContextMenuTrigger.Props,
) {
  const {render, className, style, disabled: disabledProp = false, ...elementProps} = componentProps as any;
  const children = toValue(componentProps.children);

  const rootContext = useContextMenuRootContext(false);
  const {store} = useMenuRootContext(false);
  const open = store.useState('open');
  const disabledState = store.useState('disabled');

  // props 渲染期值用 watch 同步（setup 快照过时）
  const disabledRef = ref(disabledProp);
  watch(
    () => disabledProp,
    (v) => {
      disabledRef.value = v;
    },
    {flush: 'post', immediate: true},
  );

  const triggerRef = ref<HTMLDivElement | null>(null);
  const touchPositionRef = ref<{x: number; y: number} | null>(null);
  const longPressTimeout = useTimeout();
  const allowMouseUpTimeout = useTimeout();
  const allowMouseUpRef = ref(false);
  const mouseUpAbortControllerRef = {current: null as AbortController | null};

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
    if (disabledRef.value || disabledState.value) {
      return;
    }
    rootContext.allowMouseUpTriggerRef.value = true;
    stopEvent(event);
    handleLongPress(event.clientX, event.clientY, event.nativeEvent ?? event);
    const doc = ownerDocument(triggerRef.value);

    // Abort a listener from a previous trigger that never saw its mouseup, and scope this
    // one to a fresh controller so it's removed on unmount if the mouseup never arrives.
    mouseUpAbortControllerRef.current?.abort();
    const mouseUpAbortController = new AbortController();
    mouseUpAbortControllerRef.current = mouseUpAbortController;
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
    if (disabledRef.value || disabledState.value) {
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
    mouseUpAbortControllerRef.current?.abort();
  });

  const docContextMenuCleanup = {current: () => {}};

  // Prevent the native context menu from appearing inside the trigger or backdrops.
  watch(
    () => [triggerRef.value, disabledRef.value, disabledState.value] as const,
    () => {
      docContextMenuCleanup.current();
      if (disabledRef.value || disabledState.value || !triggerRef.value) {
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
      docContextMenuCleanup.current = cleanup;
    },
    {flush: 'post', immediate: true},
  );

  onUnmounted(() => {
    docContextMenuCleanup.current();
  });

  return () => {
    const state: ContextMenuTriggerState = {
      open: open.value,
    };

    const merged: any = {
      onContextMenu: handleContextMenu,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: cancelLongPress,
      onTouchCancel: cancelLongPress,
      style: {
        WebkitTouchCallout: 'none',
        ...(style ?? {}),
      },
      ...elementProps,
    };

    Object.assign(merged, pressableTriggerOpenStateMapping.open(open.value));

    const mergedRefs = (el: HTMLDivElement | null) => {
      triggerRef.value = el;
      if (typeof componentProps.ref === 'function') {
        (componentProps.ref as any)(el);
      } else if (componentProps.ref) {
        (componentProps.ref as any).value = el;
        (componentProps.ref as any).current = el;
      }
    };

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...state, ref: mergedRefs} as any);
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof className === 'string' && typeof renderClassName === 'string'
          ? `${className} ${renderClassName}`.trim()
          : (className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={mergedRefs}>{children}</Tag>;
    }
    return (
      <div {...merged} className={className} ref={mergedRefs}>
        {children}
      </div>
    );
  };
});

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
