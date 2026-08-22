import { computed, ref, watch } from 'actview';
import { useTimeout } from '@base-ui/actview-utils/useTimeout';
import { ownerDocument } from '@base-ui/actview-utils/owner';
import { useIsoLayoutEffect } from '@base-ui/actview-utils/useIsoLayoutEffect';
import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import {
  safePolygon,
  useClick,
  useFloatingTree,
  useFocus,
  useHoverReferenceInteraction,
  useFloatingNodeId,
  useFloatingParentNodeId,
} from '@/floating-ui-actview';
import { FloatingTreeStore } from '@/floating-ui-actview/components/FloatingTreeStore';
import { contains } from '@/floating-ui-actview/utils';
import { useMenuRootContext } from '@/menu/root/MenuRootContext';
import { pressableTriggerOpenStateMapping } from '@/utils/popupStateMapping';
import { useRenderElement } from '@/internals/useRenderElement';
import type { BaseUIComponentProps, HTMLProps, NativeButtonProps } from '@/internals/types';
import { useButton } from '@/internals/use-button/useButton';
import { isMouseWithinBounds } from '@/utils/getPseudoElementBounds';
import { CompositeItem } from '@/internals/composite/item/CompositeItem';
import { useCompositeRootContext } from '@/internals/composite/root/CompositeRootContext';
import { findRootOwnerId } from '@/menu/utils/findRootOwnerId';
import { usePopupHandleStore, useTriggerDataForwarding } from '@/utils/popups';
import { useTriggerFocusGuards } from '@/utils/popups/useTriggerFocusGuards';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { REASONS } from '@/internals/reasons';
import { useMixedToggleClickHandler } from '@/utils/useMixedToggleClickHandler';
import { MenuHandle } from '@/menu/store/MenuHandle';
import { useMenubarContext } from '@/menubar/MenubarContext';
import type { MenuParent } from '@/menu/root/MenuRoot';
import { PATIENT_CLICK_THRESHOLD } from '@/internals/constants';
import { renderFocusGuard } from '@/utils/FocusGuard';
import { mergeProps } from '@/merge-props';

/**
 * A button that opens the menu.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuTrigger<Payload>(componentProps: MenuTrigger.Props<Payload>) {
  const {
    render: _render,
    className: _className,
    style: _style,
    disabled: disabledProp = false,
    nativeButton = true,
    id: idProp,
    openOnHover: openOnHoverProp,
    delay = 100,
    closeDelay = 0,
    handle,
    payload,
    ...elementProps
  } = componentProps;

  const rootContext = useMenuRootContext(true);
  const handleStore = usePopupHandleStore(handle);
  const store = handleStore.value ?? rootContext.value?.store;
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

  const triggerElementRef = { current: null as HTMLElement | null };

  const parent = useMenuParent();
  const compositeRootContext = useCompositeRootContext(true);
  const floatingTreeRootFromContext = useFloatingTree();
  const floatingTreeRoot: FloatingTreeStore =
    floatingTreeRootFromContext ?? new FloatingTreeStore();

  const floatingNodeId = useFloatingNodeId(floatingTreeRoot);
  const floatingParentNodeId = useFloatingParentNodeId();

  const { registerTrigger, isMountedByThisTrigger } = useTriggerDataForwarding(
    thisTriggerId,
    triggerElementRef,
    store,
    {
      payload,
      closeDelay,
      parent: parent.value,
      floatingTreeRoot,
      floatingNodeId,
      floatingParentNodeId,
      keyboardEventRelay: compositeRootContext.value?.relayKeyboardEvent,
    },
  );

  const isInMenubar = parent.value.type === 'menubar';

  const rootDisabled = store.useState('disabled');
  const disabled = computed(() =>
    disabledProp || rootDisabled.value || (isInMenubar && parent.value.context.disabled),
  );

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
  });

  watch(
    [isOpenedByThisTrigger, () => parent.value.type],
    () => {
      if (!isOpenedByThisTrigger.value && parent.value.type === undefined) {
        store.context.allowMouseUpTriggerRef.current = false;
      }
    },
    { immediate: true },
  );

  const triggerRef = { current: null as HTMLElement | null };
  const allowMouseUpTriggerTimeout = useTimeout();

  const handleDocumentMouseUp = (mouseEvent: MouseEvent) => {
    if (!triggerRef.current) {
      return;
    }

    allowMouseUpTriggerTimeout.clear();
    store.context.allowMouseUpTriggerRef.current = false;

    const mouseUpTarget = mouseEvent.target as Element | null;

    if (
      contains(triggerRef.current, mouseUpTarget) ||
      contains(store.select('positionerElement'), mouseUpTarget) ||
      mouseUpTarget === triggerRef.current
    ) {
      return;
    }

    if (mouseUpTarget != null && findRootOwnerId(mouseUpTarget) === store.select('rootId')) {
      return;
    }

    if (isMouseWithinBounds(mouseEvent, triggerRef.current)) {
      return;
    }

    floatingTreeRoot.events.emit('close', { domEvent: mouseEvent, reason: REASONS.cancelOpen });
  };

  watch(
    [isOpenedByThisTrigger, () => store.select('lastOpenChangeReason')],
    () => {
      if (isOpenedByThisTrigger.value && store.select('lastOpenChangeReason') === REASONS.triggerHover) {
        const doc = ownerDocument(triggerRef.current);
        doc.addEventListener('mouseup', handleDocumentMouseUp, { once: true });
      }
    },
    { immediate: true },
  );

  const parentMenubarHasSubmenuOpen = isInMenubar && parent.value.context.hasSubmenuOpen;
  const openOnHover = openOnHoverProp ?? parentMenubarHasSubmenuOpen;

  const hoverProps = useHoverReferenceInteraction(floatingRootContext.value, {
    enabled: computed(
      () =>
        openOnHover &&
        !disabled.value &&
        (!isInMenubar || (parentMenubarHasSubmenuOpen && !isMountedByThisTrigger.value)),
    ) as unknown as boolean,
    handleClose: safePolygon({ blockPointerEvents: !isInMenubar }),
    mouseOnly: true,
    move: false,
    restMs: parent.value.type === undefined ? delay : undefined,
    delay: { close: closeDelay },
    triggerElementRef,
    externalTree: floatingTreeRoot,
    isActiveTrigger: isTriggerActive.value,
    isClosing: () => store.select('transitionStatus') === 'ending',
  });

  // Whether to ignore clicks to open the menu.
  // `lastOpenChangeReason` doesn't need to be reactive here, as we need to run this
  // only when `isOpenedByThisTrigger` changes.
  const stickIfOpen = useStickIfOpen(isOpenedByThisTrigger, () =>
    store.select('lastOpenChangeReason'),
  );

  const click = useClick(floatingRootContext.value, {
    enabled: !disabled.value,
    event: isOpenedByThisTrigger.value && isInMenubar ? 'click' : 'mousedown',
    toggle: true,
    ignoreMouse: false,
    stickIfOpen: parent.value.type === undefined ? stickIfOpen.value : false,
  });

  const focus = useFocus(floatingRootContext.value, {
    enabled: !disabled.value && parentMenubarHasSubmenuOpen,
  });

  const getMixedToggleHandlers = useMixedToggleClickHandler({
    open: isOpenedByThisTrigger,
    enabled: isInMenubar,
    mouseDownAction: 'open',
  });

  const localInteractionProps = mergeProps(focus.reference, click.reference);

  const rootTriggerProps = store.useState('triggerProps', isMountedByThisTrigger.value);

  const { preFocusGuardRef, handlePreFocusGuardFocus, handleFocusTargetFocus } =
    useTriggerFocusGuards(store, triggerElementRef);

  const state = computed<MenuTriggerState>(() => ({
    disabled: disabled.value,
    open: isOpenedByThisTrigger.value,
  }));

  const ref = [triggerRef, componentProps.ref, buttonRef, registerTrigger, triggerElementRef];
  const props = [
    localInteractionProps,
    hoverProps,
    // Getters must chain event handlers via `mergeProps`, otherwise the spread would overwrite
    // handlers from earlier props (AD-20/AD-27).
    (prev: any) => mergeProps(prev, rootTriggerProps.value) as HTMLProps,
    // The custom `onMouseDown` must be merged (not spread), or it would replace `click.reference`'s
    // `onMouseDown` that opens the menu (getters replace prev without event chaining — AD-20).
    (prev: any) =>
      mergeProps(prev, {
        'aria-haspopup': 'menu' as const,
        'aria-controls': popupId.value,
        id: thisTriggerId,
        onMouseDown: (event: MouseEvent) => {
          if (store.select('open')) {
            return;
          }

          // mousedown -> mouseup on menu item should not trigger it within 200ms.
          allowMouseUpTriggerTimeout.start(200, () => {
            store.context.allowMouseUpTriggerRef.current = true;
          });

          const doc = ownerDocument(event.currentTarget as Element);
          doc.addEventListener('mouseup', handleDocumentMouseUp, { once: true });
        },
      }) as HTMLProps,
    isInMenubar ? { role: 'menuitem' } : {},
    getMixedToggleHandlers(),
    elementProps,
    getButtonProps,
  ];

  if (isInMenubar) {
    return (
      <CompositeItem
        tag="button"
        render={componentProps.render as any}
        className={componentProps.className as any}
        style={componentProps.style as any}
        state={state}
        refs={ref}
        props={props as any}
        stateAttributesMapping={pressableTriggerOpenStateMapping}
      />
    );
  }

  const getElement = useRenderElement('button', componentProps, {
    enabled: !isInMenubar,
    stateAttributesMapping: pressableTriggerOpenStateMapping,
    state,
    ref,
    props,
  });

  // The focus guards are conditionally rendered around a stable `getElement()` position so the
  // trigger DOM node is preserved when they mount/unmount (plantform-diff.md AD-29).
  const shouldRenderGuards = computed(() => isOpenedByThisTrigger.value);

  return (
    <>
      {shouldRenderGuards.value &&
        renderFocusGuard({ onFocus: handlePreFocusGuardFocus }, preFocusGuardRef)}
      {getElement()}
      {shouldRenderGuards.value &&
        renderFocusGuard(
          { onFocus: handleFocusTargetFocus },
          store.context.triggerFocusTargetRef,
        )}
    </>
  );
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
   * How long to wait before the menu may be opened on hover. Specified in milliseconds.
   *
   * Requires the `openOnHover` prop.
   * @default 100
   */
  delay?: number | undefined;
  /**
   * How long to wait before closing the menu that was opened on hover.
   * Specified in milliseconds.
   *
   * Requires the `openOnHover` prop.
   * @default 0
   */
  closeDelay?: number | undefined;
  /**
   * Whether the menu should also open when the trigger is hovered.
   */
  openOnHover?: boolean | undefined;
}

export namespace MenuTrigger {
  export type Props<Payload = unknown> = MenuTriggerProps<Payload>;
  export type State = MenuTriggerState;
}

/**
 * Determines whether to ignore clicks after a hover-open.
 */
function useStickIfOpen(open: ReturnType<typeof ref<boolean>>, openReason: () => string | null) {
  const stickIfOpenTimeout = useTimeout();
  const stickIfOpen = ref(false);
  watch(
    open,
    (isOpen) => {
      if (isOpen && openReason() === REASONS.triggerHover) {
        // Only allow "patient" clicks to close the menu if it's open.
        // If they clicked within 500ms of the menu opening, keep it open.
        stickIfOpen.value = true;
        stickIfOpenTimeout.start(PATIENT_CLICK_THRESHOLD, () => {
          stickIfOpen.value = false;
        });
      } else if (!isOpen) {
        stickIfOpenTimeout.clear();
        stickIfOpen.value = false;
      }
    },
    { immediate: true },
  );

  return stickIfOpen;
}

function useMenuParent() {
  const menubarContext = useMenubarContext(true);

  const parent = computed<MenuParent>(() => {
    if (menubarContext.value) {
      return {
        type: 'menubar',
        context: menubarContext.value,
      };
    }

    return {
      type: undefined,
    };
  });

  return parent;
}
