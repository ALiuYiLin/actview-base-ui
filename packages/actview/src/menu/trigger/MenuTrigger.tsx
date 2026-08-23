import { defineComponent, onUnmounted, ref, toValue, watch } from 'actview';
import type { Ref } from 'actview';
import { useTimeout } from '@/utils/useTimeout';
import { ownerDocument } from '@/internals/owner';
import { useStableCallback } from '@/utils/useStableCallback';
import { EMPTY_OBJECT } from '@/utils/empty';
import {
  safePolygon,
  useClick,
  useFloatingTree,
  useFocus,
  useHoverReferenceInteraction,
} from '@/floating-ui-react';
import type { FloatingTreeStore } from '@/floating-ui-react/components/FloatingTreeStore';
import { contains } from '@/floating-ui-react/utils';
import { useMenuRootContext } from '../root/MenuRootContext';
import { pressableTriggerOpenStateMapping } from '@/utils/popupStateMapping';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { useButton } from '@/internals/use-button/useButton';
import { isMouseWithinBounds } from '@/utils/getPseudoElementBounds';
import { CompositeItem } from '@/internals/composite/item/CompositeItem';
import { findRootOwnerId } from '../utils/findRootOwnerId';
import { usePopupHandleStore, useTriggerDataForwarding } from '@/utils/popups';
import { useTriggerFocusGuards } from '@/utils/popups/useTriggerFocusGuards';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { REASONS } from '@/internals/reasons';
import { useMixedToggleClickHandler } from '@/utils/useMixedToggleClickHandler';
import type { MenuHandle } from '../store/MenuHandle';
import { useMenubarContext } from '@/menubar/MenubarContext';
import type { MenuParent } from '../root/MenuRoot';
import { PATIENT_CLICK_THRESHOLD } from '@/internals/constants';
import { FocusGuard } from '@/utils/FocusGuard';
import { mergeProps, mergePropsN } from '@/merge-props';

/**
 * A button that opens the menu.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export const MenuTrigger = defineComponent(function MenuTrigger(
  componentProps: MenuTrigger.Props,
) {
  const {
    render,
    className,
    style,
    disabled: disabledProp = false,
    nativeButton = true,
    id: idProp,
    openOnHover: openOnHoverProp,
    delay = 100,
    closeDelay = 0,
    handle,
    payload,
  } = componentProps;

  const children = toValue(componentProps.children);

  const rootContext = useMenuRootContext(true);
  const handleStore = usePopupHandleStore(handle);
  const store = handleStore?.value ?? rootContext?.store;
  if (!store) {
    throw new Error(
      'Base UI: <Menu.Trigger> must be either used within a <Menu.Root> component or provided with a handle.',
    );
  }

  const thisTriggerId = useBaseUiId(idProp);
  const isTriggerActive = store.useState('isTriggerActive', thisTriggerId);
  const floatingRootContext = store.useState('floatingRootContext');
  const isOpenedByThisTrigger = store.useState('isOpenedByTrigger', thisTriggerId);
  const popupId = store.useState('triggerPopupId', thisTriggerId);

  const triggerElementRef = ref<HTMLElement | null>(null);

  const parent = useMenuParent();
  const compositeRootContext = useCompositeRootContextForTrigger();
  const floatingTreeRootFromContext = useFloatingTree();
  const floatingTreeRoot: FloatingTreeStore = (() => {
    return (
      floatingTreeRootFromContext ??
      (store.state.floatingTreeRoot as unknown as FloatingTreeStore) ??
      (floatingTreeRootFromContext as unknown as FloatingTreeStore)
    );
  })();

  const menubarContext = useMenubarContext(true);
  const isInMenubar = !!menubarContext && parent.type === 'menubar';

  watch(
    () => [isOpenedByThisTrigger.value, store, parent.type] as const,
    () => {
      if (isOpenedByThisTrigger.value && store.select('lastOpenChangeReason') === REASONS.triggerHover) {
        store.context.allowMouseUpTriggerRef.value = false;
      }
    },
    {flush: 'post', immediate: true},
  );

  const allowMouseUpTriggerTimeout = useTimeout();

  const handleDocumentMouseUp = useStableCallback((mouseEvent: MouseEvent) => {
    if (!triggerElementRef.value) {
      return;
    }

    allowMouseUpTriggerTimeout.clear();
    store.context.allowMouseUpTriggerRef.value = false;

    const mouseUpTarget = mouseEvent.target as Element | null;

    if (
      contains(triggerElementRef.value, mouseUpTarget) ||
      contains(store.select('positionerElement'), mouseUpTarget) ||
      mouseUpTarget === triggerElementRef.value
    ) {
      return;
    }

    if (mouseUpTarget != null && findRootOwnerId(mouseUpTarget) === store.select('rootId')) {
      return;
    }

    if (isMouseWithinBounds(mouseEvent, triggerElementRef.value)) {
      return;
    }

    floatingTreeRoot.events.emit('close', {domEvent: mouseEvent, reason: REASONS.cancelOpen});
  });

  watch(
    () => [isOpenedByThisTrigger.value, store] as const,
    () => {
      if (
        isOpenedByThisTrigger.value &&
        store.select('lastOpenChangeReason') === REASONS.triggerHover
      ) {
        const doc = ownerDocument(triggerElementRef.value);
        doc.addEventListener('mouseup', handleDocumentMouseUp, {once: true});
      }
    },
    {flush: 'post', immediate: true},
  );

  const parentMenubarHasSubmenuOpen = isInMenubar && parent.context.hasSubmenuOpen;
  const openOnHover = openOnHoverProp ?? parentMenubarHasSubmenuOpen;
  const isMountedByThisTrigger = store.useState('isMountedByTrigger', thisTriggerId);

  const hoverProps = useHoverReferenceInteraction(floatingRootContext.value, {
    enabled:
      openOnHover &&
      !disabledProp &&
      (!isInMenubar || (parentMenubarHasSubmenuOpen && !isMountedByThisTrigger.value)),
    handleClose: safePolygon({blockPointerEvents: !isInMenubar}) as any,
    mouseOnly: true,
    move: false,
    restMs: parent.type === undefined ? delay : undefined,
    delay: {close: closeDelay},
    triggerElementRef: triggerElementRef as any,
    externalTree: floatingTreeRoot,
    isActiveTrigger: isTriggerActive.value,
    isClosing: () => store.select('transitionStatus') === 'ending',
  });

  // Whether to ignore clicks to open the menu.
  const stickIfOpen = useStickIfOpen(isOpenedByThisTrigger, () =>
    store.select('lastOpenChangeReason'),
  );

  const click = useClick(floatingRootContext.value, {
    enabled: !disabledProp,
    event: isOpenedByThisTrigger.value && isInMenubar ? 'click' : 'mousedown',
    toggle: true,
    ignoreMouse: false,
    stickIfOpen: parent.type === undefined ? stickIfOpen.value : false,
  });

  const focus = useFocus(floatingRootContext.value, {
    enabled: !disabledProp && parentMenubarHasSubmenuOpen,
  });

  const mixedToggleHandlers = useMixedToggleClickHandler({
    open: isOpenedByThisTrigger,
    enabled: isInMenubar,
    mouseDownAction: 'open',
  });

  const localInteractionProps = mergeProps(focus.reference, click.reference);

  const rootTriggerProps = store.useState('triggerProps', isMountedByThisTrigger.value);

  const {preFocusGuardRef, handlePreFocusGuardFocus, handleFocusTargetFocus} =
    useTriggerFocusGuards(store, triggerElementRef);

  const state: MenuTriggerState = {
    disabled: disabledProp,
    open: isOpenedByThisTrigger.value,
  };

  const button = useButton({
    disabled: disabledProp,
    native: nativeButton,
  });
  const buttonRef = button.buttonRef;
  const getButtonProps = button.getButtonProps;

  const {registerTrigger, isMountedByThisTrigger: mountedByThis} = useTriggerDataForwarding(
    thisTriggerId,
    triggerElementRef as any,
    store,
    {payload: payload as any},
  );

  const refs = [
    (el: HTMLElement | null) => {
      triggerElementRef.value = el;
    },
    buttonRef,
    registerTrigger,
  ] as any[];

  const propsList = [
    localInteractionProps,
    hoverProps ?? EMPTY_OBJECT,
    rootTriggerProps.value,
    {
      'aria-haspopup': 'menu' as const,
      'aria-controls': popupId.value,
      id: thisTriggerId,
      onMouseDown: (event: any) => {
        if (store.select('open')) {
          return;
        }

        // mousedown -> mouseup on menu item should not trigger it within 200ms.
        allowMouseUpTriggerTimeout.start(200, () => {
          store.context.allowMouseUpTriggerRef.value = true;
        });

        const doc = ownerDocument(event.currentTarget);
        doc.addEventListener('mouseup', handleDocumentMouseUp, {once: true});
      },
    },
    isInMenubar ? {role: 'menuitem'} : {},
    mixedToggleHandlers,
    getButtonProps,
  ];

  return () => {
    const {className: cls, style: st, render: r, ...elementProps} = componentProps;

    const mergedPropsForRender = (() => {
      const merged = mergePropsN<any>([...propsList, elementProps]);
      const stateAttributes = {};
      if ((globalThis as any).__DSH_TRIGGER_DEBUG) {
        // eslint-disable-next-line no-console
        console.log('[MenuTrigger] render isOpened=' + String(isOpenedByThisTrigger.value));
      }
      Object.assign(stateAttributes, pressableTriggerOpenStateMapping.open(isOpenedByThisTrigger.value));
      Object.assign(merged, stateAttributes);
      return merged;
    })();

    if (isInMenubar) {
      return (
        <CompositeItem
          tag="button"
          render={r}
          className={cls}
          style={st}
          state={state}
          refs={refs}
          props={propsList}
          stateAttributesMapping={pressableTriggerOpenStateMapping}
        >
          {children}
        </CompositeItem>
      );
    }

    const element = (
      <button {...mergedPropsForRender} ref={mergeRefs(refs)}>
        {children}
      </button>
    );

    if (isOpenedByThisTrigger.value) {
      return (
        <div key={`${thisTriggerId}-guards`}>
          <FocusGuard
            ref={(el: any) => (preFocusGuardRef.value = el)}
            onFocus={handlePreFocusGuardFocus}
          />
          {element}
          <FocusGuard
            ref={(el: any) => (store.context.triggerFocusTargetRef.value = el)}
            onFocus={handleFocusTargetFocus}
          />
        </div>
      );
    }

    return element;
  };
});

/**
 * Determines whether to ignore clicks after a hover-open.
 * (actview 版：返回 Ref<boolean> 读 .value。)
 */
function useStickIfOpen(open: Ref<boolean>, getOpenReason: () => string | null) {
  const stickIfOpenTimeout = useTimeout();
  const stickIfOpen = ref(false);

  watch(
    () => [open.value, getOpenReason()] as const,
    () => {
      const openReason = getOpenReason();
      if (open.value && openReason === REASONS.triggerHover) {
        // Only allow "patient" clicks to close the menu if it's open.
        stickIfOpen.value = true;
        stickIfOpenTimeout.start(PATIENT_CLICK_THRESHOLD, () => {
          stickIfOpen.value = false;
        });
      } else if (!open.value) {
        stickIfOpenTimeout.clear();
        stickIfOpen.value = false;
      }
    },
    {flush: 'post', immediate: true},
  );

  return stickIfOpen;
}

function useMenuParent() {
  const menubarContext = useMenubarContext(true);

  const parent: MenuParent = (() => {
    if (menubarContext) {
      return {
        type: 'menubar',
        context: menubarContext,
      };
    }

    return {
      type: undefined,
    };
  })();

  return parent;
}

function useCompositeRootContextForTrigger() {
  return undefined as any;
}

function mergeRefs(refs: any[]) {
  return (el: HTMLElement | null) => {
    for (const r of refs) {
      if (typeof r === 'function') {
        r(el);
      } else if (r) {
        r.value = el;
      }
    }
  };
}

export interface MenuTriggerProps<Payload = unknown>
  extends NativeButtonProps, BaseUIComponentProps<'button', MenuTriggerState> {
  children?: any;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * A handle to associate the trigger with a menu.
   */
  handle?: MenuHandle<Payload> | undefined;
  /**
   * A payload to pass to the menu when it is opened.
   */
  payload?: Payload | undefined;
  /**
   * How long to wait before the menu may be opened on hover.
   * @default 100
   */
  delay?: number | undefined;
  /**
   * How long to wait before closing the menu that was opened on hover.
   * @default 0
   */
  closeDelay?: number | undefined;
  /**
   * Whether the menu should also open when the trigger is hovered.
   */
  openOnHover?: boolean | undefined;
}

export interface MenuTriggerState {
  /**
   * Whether the menu is currently open and was opened by this trigger.
   */
  open: boolean;
  /**
   * Whether the trigger is disabled.
   */
  disabled: boolean;
}

export namespace MenuTrigger {
  export type Props<Payload = unknown> = MenuTriggerProps<Payload>;
  export type State = MenuTriggerState;
}
