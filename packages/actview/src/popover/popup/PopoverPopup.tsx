import { computed, watch } from 'actview';
import type { InteractionType } from '@base-ui/actview-utils/useEnhancedClickHandler';
import { isHTMLElement } from '@floating-ui/utils/dom';
import { FloatingFocusManager, useHoverFloatingInteraction } from '@/floating-ui-actview';
import { usePopoverRootContext } from '@/popover/root/PopoverRootContext';
import { usePopoverPositionerContext } from '@/popover/positioner/PopoverPositionerContext';
import type { Side, Align } from '@/internals/useAnchorPositioning';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { mergeProps } from '@/merge-props';
import type { TransitionStatus } from '@/internals/useTransitionStatus';
import { popupTransitionStateMapping } from '@/utils/popupStateMapping';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { useRenderElement } from '@/internals/useRenderElement';
import { REASONS } from '@/internals/reasons';
import { COMPOSITE_KEYS } from '@/internals/composite/composite';
import { useToolbarRootContext } from '@/toolbar/root/ToolbarRootContext';
import { getDisabledMountTransitionStyles } from '@/internals/getDisabledMountTransitionStyles';
import { ClosePartContext, useClosePartCount } from '@/utils/closePart';
import { FOCUSABLE_POPUP_PROPS, createDefaultInitialFocus } from '@/utils/popups';

/**
 * A container for the popover contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverPopup(componentProps: PopoverPopup.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    initialFocus,
    finalFocus,
    ...elementProps
  } = componentProps;

  const store = usePopoverRootContext().value!;

  const positioner = usePopoverPositionerContext();
  const insideToolbar = useToolbarRootContext(true).value != null;
  const { context: closePartContext, hasClosePart } = useClosePartCount();

  const open = store.useState('open');
  const openMethod = store.useState('openMethod');
  const instantType = store.useState('instantType');
  const transitionStatus = store.useState('transitionStatus');
  const popupProps = store.useState('popupProps');
  const titleId = store.useState('titleElementId');
  const descriptionId = store.useState('descriptionElementId');
  const modal = store.useState('modal');
  const mounted = store.useState('mounted');
  const openReason = store.useState('openChangeReason');
  const activeTriggerElement = store.useState('activeTriggerElement');
  const floatingContext = store.useState('floatingRootContext');
  const floatingId = floatingContext.value.useState('floatingId');
  const disabled = store.useState('disabled');
  const openOnHover = store.useState('openOnHover');
  const closeDelay = store.useState('closeDelay');

  useOpenChangeComplete({
    open,
    ref: store.context.popupRef,
    onComplete() {
      if (open.value) {
        store.context.onOpenChangeComplete?.(true);
      }
    },
  });

  useHoverFloatingInteraction(floatingContext.value, {
    enabled: openOnHover.value && !disabled.value,
    closeDelay: closeDelay.value,
  });

  const resolvedInitialFocus =
    initialFocus === undefined ? createDefaultInitialFocus(store.context.popupRef) : initialFocus;

  const focusManagerModal = computed(() => modal.value !== false && hasClosePart.value);
  store.useSyncedValue('focusManagerModal', focusManagerModal);

  const setPopupElement = store.useStateSetter('popupElement');

  const state = computed<PopoverPopupState>(() => ({
    open: open.value,
    side: positioner.value.side,
    align: positioner.value.align,
    instant: instantType.value,
    transitionStatus: transitionStatus.value,
  }));

  const element = useRenderElement('div', componentProps, {
    state,
    ref: [componentProps.ref, store.context.popupRef, setPopupElement],
    props: [
      (prev: any) => mergeProps(prev, popupProps.value) as HTMLProps,
      (prev: any) =>
        mergeProps(prev, {
          id: floatingId.value,
          role: 'dialog',
          ...FOCUSABLE_POPUP_PROPS,
          'aria-labelledby': titleId.value,
          'aria-describedby': descriptionId.value,
          onKeyDown(event: KeyboardEvent) {
            if (insideToolbar && COMPOSITE_KEYS.has(event.key)) {
              event.stopPropagation();
            }
          },
        }) as HTMLProps,
      (prev: any) => ({
        ...prev,
        ...getDisabledMountTransitionStyles(transitionStatus.value),
      }),
      elementProps,
    ],
    stateAttributesMapping: popupTransitionStateMapping,
  });

  // The focus manager is only rendered while the popup is mounted and not opened by hover:
  // `disabled` is not reactive in the ActView port of `FloatingFocusManager`, so it must be
  // mounted with its final value (plantform-diff.md AD-28).
  const shouldRenderFocusManager = computed(
    () => mounted.value && openReason.value !== REASONS.triggerHover,
  );

  return (
    <>
      {shouldRenderFocusManager.value ? (
        <FloatingFocusManager
          context={floatingContext.value}
          openInteractionType={openMethod.value}
          modal={focusManagerModal.value}
          disabled={false}
          initialFocus={resolvedInitialFocus}
          returnFocus={finalFocus}
          restoreFocus="popup"
          previousFocusableElement={
            isHTMLElement(activeTriggerElement.value) ? activeTriggerElement.value : undefined
          }
          nextFocusableElement={store.context.triggerFocusTargetRef}
          beforeContentFocusGuardRef={store.context.beforeContentFocusGuardRef}
        >
          <ClosePartContext.Provider value={closePartContext}>{element()}</ClosePartContext.Provider>
        </FloatingFocusManager>
      ) : (
        element()
      )}
    </>
  );
}

export interface PopoverPopupState {
  /**
   * Whether the popover is currently open.
   */
  open: boolean;
  /**
   * The side of the anchor the component is placed on.
   */
  side: Side;
  /**
   * The alignment of the component relative to the anchor.
   */
  align: Align;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
  /**
   * Whether transitions should be skipped.
   */
  instant: 'dismiss' | 'click' | 'focus' | 'trigger-change' | undefined;
}

export interface PopoverPopupProps extends BaseUIComponentProps<'div', PopoverPopupState> {
  /**
   * Determines the element to focus when the popover is opened.
   * By default, focus moves to the first tabbable element inside the popup, except when the popover
   * is opened by touch — then the popup itself is focused to avoid opening the virtual keyboard.
   *
   * - `false`: Do not move focus.
   * - `true`: Move focus based on the default behavior (first tabbable element or popup).
   * - `RefObject`: Move focus to the ref element.
   * - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).
   *   Return an element to focus, `true` to use the default behavior, `null` to fall back to the default behavior, or `false`/`undefined` to do nothing.
   */
  initialFocus?:
    | boolean
    | { current: HTMLElement | null }
    | ((openType: InteractionType) => void | boolean | HTMLElement | null)
    | undefined;
  /**
   * Determines the element to focus when the popover is closed.
   *
   * - `false`: Do not move focus.
   * - `true`: Move focus based on the default behavior (trigger or previously focused element).
   * - `RefObject`: Move focus to the ref element.
   * - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).
   *   Return an element to focus, `true` to use the default behavior, `null` to fall back to the default behavior, or `false`/`undefined` to do nothing.
   */
  finalFocus?:
    | boolean
    | { current: HTMLElement | null }
    | ((closeType: InteractionType) => void | boolean | HTMLElement | null)
    | undefined;
}

export namespace PopoverPopup {
  export type State = PopoverPopupState;
  export type Props = PopoverPopupProps;
}
