import { computed } from 'actview';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { useButton } from '../../internals/use-button';
import type { BaseUIComponentProps, HTMLProps, NativeButtonProps } from '../../internals/types';
import { mergeProps } from '../../merge-props';
import {
  triggerOpenStateMapping,
  pressableTriggerOpenStateMapping,
} from '../../utils/popupStateMapping';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { useRenderElement } from '../../internals/useRenderElement';
import { CLICK_TRIGGER_IDENTIFIER } from '../../internals/constants';
import { safePolygon, useClick, useHoverReferenceInteraction } from '../../floating-ui-actview';
import { OPEN_DELAY } from '../utils/constants';
import { PopoverHandle } from '../store/PopoverHandle';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { renderFocusGuard } from '../../utils/FocusGuard';
import { REASONS } from '../../internals/reasons';
import { usePopupHandleStore, useTriggerDataForwarding } from '../../utils/popups';
import { useTriggerFocusGuards } from '../../utils/popups/useTriggerFocusGuards';
import { useOpenMethodTriggerProps } from '../../utils/useOpenInteractionType';
import type { PopoverStore } from '../store/PopoverStore';

/**
 * A button that opens the popover.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverTrigger(componentProps: PopoverTrigger.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    disabled = false,
    nativeButton = true,
    handle,
    payload,
    openOnHover = false,
    delay = OPEN_DELAY,
    closeDelay = 0,
    id: idProp,
    ...elementProps
  } = componentProps;

  const rootStore = usePopoverRootContext(true);
  const handleStore = usePopupHandleStore(handle);
  const store = (handleStore.value ?? rootStore.value) as PopoverStore<any> | undefined;
  if (!store) {
    throw new Error(
      'Base UI: <Popover.Trigger> must be either used within a <Popover.Root> component or provided with a handle.',
    );
  }

  const thisTriggerId = useBaseUiId(idProp);
  const isTriggerActive = store.useState('isTriggerActive', thisTriggerId);
  const floatingContext = store.useState('floatingRootContext');
  const isOpenedByThisTrigger = store.useState('isOpenedByTrigger', thisTriggerId);
  const popupId = store.useState('triggerPopupId', thisTriggerId);

  const triggerElementRef = { current: null as HTMLElement | null };

  const { registerTrigger, isMountedByThisTrigger } = useTriggerDataForwarding(
    thisTriggerId,
    triggerElementRef,
    store,
    {
      payload,
      disabled,
      openOnHover,
      closeDelay,
    },
  );

  const openReason = store.useState('openChangeReason');
  const stickIfOpen = store.useState('stickIfOpen');
  const openMethod = store.useState('openMethod');
  const focusManagerModal = store.useState('focusManagerModal');

  const hoverProps = useHoverReferenceInteraction(floatingContext.value, {
    enabled: computed(
      () =>
        !disabled &&
        openOnHover &&
        (openMethod.value !== 'touch' || openReason.value !== REASONS.triggerPress),
    ) as unknown as boolean,
    mouseOnly: true,
    move: false,
    handleClose: safePolygon(),
    restMs: delay,
    delay: {
      close: closeDelay,
    },
    triggerElementRef,
    isActiveTrigger: isTriggerActive.value,
    isClosing: () => store.select('transitionStatus') === 'ending',
  });

  const click = useClick(floatingContext.value, { stickIfOpen: stickIfOpen.value });
  const interactionTypeProps = useOpenMethodTriggerProps(
    () => store.select('open'),
    (interactionType) => {
      store.set('openMethod', interactionType);
    },
  );

  const rootTriggerProps = store.useState(
    'triggerProps',
    isMountedByThisTrigger as unknown as boolean,
  );

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
  });

  const stateAttributesMapping: StateAttributesMapping<{ open: boolean }> = {
    open(value) {
      if (value && openReason.value === REASONS.triggerPress) {
        return pressableTriggerOpenStateMapping.open(value);
      }

      return triggerOpenStateMapping.open(value);
    },
  };

  const { preFocusGuardRef, handlePreFocusGuardFocus, handleFocusTargetFocus } =
    useTriggerFocusGuards(store, triggerElementRef);

  const state = computed<PopoverTriggerState>(() => ({
    disabled,
    open: isOpenedByThisTrigger.value,
  }));

  const element = useRenderElement('button', componentProps, {
    state,
    ref: [buttonRef, componentProps.ref, registerTrigger, triggerElementRef],
    props: [
      click.reference,
      hoverProps,
      // Getters must chain event handlers via `mergeProps`, otherwise the spread would
      // overwrite handlers from earlier props (AD-20/AD-27).
      (prev: any) => mergeProps(prev, rootTriggerProps.value) as HTMLProps,
      interactionTypeProps,
      (prev: any) => ({
        ...prev,
        [CLICK_TRIGGER_IDENTIFIER]: '',
        id: thisTriggerId,
        'aria-haspopup': 'dialog' as const,
        'aria-expanded': isOpenedByThisTrigger.value ? 'true' : 'false',
        'aria-controls': popupId.value,
      }),
      elementProps,
      getButtonProps,
    ],
    stateAttributesMapping,
  });

  // Keep `element()` at a stable position in the tree (index 1) so the trigger DOM node is
  // preserved when the focus guards mount/unmount; otherwise ActView would rebuild the node and
  // break `domReferenceElement` identity (plantform-diff.md AD-29).
  const shouldRenderGuards = computed(() => isMountedByThisTrigger.value && !focusManagerModal.value);

  return (
    <>
      {shouldRenderGuards.value &&
        renderFocusGuard({ onFocus: handlePreFocusGuardFocus }, preFocusGuardRef)}
      {element()}
      {shouldRenderGuards.value &&
        renderFocusGuard(
          { onFocus: handleFocusTargetFocus },
          store.context.triggerFocusTargetRef,
        )}
    </>
  );
}

export interface PopoverTriggerState {
  /**
   * Whether the trigger is currently disabled.
   */
  disabled: boolean;
  /**
   * Whether the popover is currently open and was opened by this trigger.
   */
  open: boolean;
}

export type PopoverTriggerProps<Payload = unknown> = NativeButtonProps &
  BaseUIComponentProps<'button', PopoverTriggerState> & {
    /**
     * Whether the component renders a native `<button>` element when replacing it
     * via the `render` prop.
     * Set to `false` if the rendered element is not a button (e.g. `<div>`).
     * @default true
     */
    nativeButton?: boolean | undefined;
    /**
     * A handle to associate the trigger with a popover.
     */
    handle?: PopoverHandle<Payload> | undefined;
    /**
     * A payload to pass to the popover when it is opened.
     */
    payload?: Payload | undefined;
    /**
     * ID of the trigger. In addition to being forwarded to the rendered element,
     * it is also used to specify the active trigger for the popover in controlled mode (with the PopoverRoot `triggerId` prop).
     */
    id?: string | undefined;
    /**
     * Whether the popover should also open when the trigger is hovered.
     * @default false
     */
    openOnHover?: boolean | undefined;
    /**
     * How long to wait before the popover may be opened on hover. Specified in milliseconds.
     *
     * Requires the `openOnHover` prop.
     * @default 300
     */
    delay?: number | undefined;
    /**
     * How long to wait before closing the popover that was opened on hover.
     * Specified in milliseconds.
     *
     * Requires the `openOnHover` prop.
     * @default 0
     */
    closeDelay?: number | undefined;
  };

export namespace PopoverTrigger {
  export type State = PopoverTriggerState;
  export type Props<Payload = unknown> = PopoverTriggerProps<Payload>;
}
