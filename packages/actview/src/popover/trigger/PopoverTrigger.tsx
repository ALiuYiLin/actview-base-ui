import { defineComponent, ref, toValue } from 'actview';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useButton } from '@/internals/use-button/useButton';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { triggerOpenStateMapping, pressableTriggerOpenStateMapping } from '@/utils/popupStateMapping';
import { safePolygon, useClick, useHoverReferenceInteraction } from '@/floating-ui-react';
import { PopoverHandle } from '../store/PopoverHandle';
import { FocusGuard } from '@/utils/FocusGuard';
import { REASONS } from '@/internals/reasons';
import { usePopupHandleStore, useTriggerDataForwarding } from '@/utils/popups';
import { useTriggerFocusGuards } from '@/utils/popups/useTriggerFocusGuards';
import { useOpenMethodTriggerProps } from '@/utils/useOpenInteractionType';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { EMPTY_OBJECT } from '@/utils/empty';
import { mergePropsN } from '@/merge-props';

const OPEN_DELAY = 300;

/**
 * A button that opens the popover.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export const PopoverTrigger = defineComponent(function PopoverTrigger(
  componentProps: PopoverTrigger.Props,
) {
  const {
    render,
    className,
    style,
    disabled = false,
    nativeButton = true,
    handle,
    payload,
    openOnHover = false,
    delay = OPEN_DELAY,
    closeDelay = 0,
    id: idProp,
    ...elementProps
  } = componentProps as any;

  const children = toValue(componentProps.children);

  const rootStore = usePopoverRootContext(true);
  const handleStore = usePopupHandleStore(handle);
  const store: any = handleStore?.value ?? rootStore;
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

  const triggerElementRef = ref<HTMLElement | null>(null);

  const {registerTrigger, isMountedByThisTrigger} = useTriggerDataForwarding(
    thisTriggerId,
    triggerElementRef as any,
    store,
    {
      payload,
      disabled,
      openOnHover,
      closeDelay,
    } as any,
  );

  const openReason = store.useState('openChangeReason');
  const stickIfOpen = store.useState('stickIfOpen');
  const openMethod = store.useState('openMethod');
  const focusManagerModal = store.useState('focusManagerModal');

  const hoverProps = useHoverReferenceInteraction(floatingContext.value, {
    enabled:
      !disabled &&
      openOnHover &&
      (openMethod.value !== 'touch' || openReason.value !== REASONS.triggerPress),
    mouseOnly: true,
    move: false,
    handleClose: safePolygon() as any,
    restMs: delay,
    delay: {
      close: closeDelay,
    },
    triggerElementRef: triggerElementRef as any,
    isActiveTrigger: isTriggerActive.value,
    isClosing: () => store.select('transitionStatus') === 'ending',
  });

  const click = useClick(floatingContext.value, {stickIfOpen: stickIfOpen.value});

  const interactionTypeProps = useOpenMethodTriggerProps(
    () => store.select('open'),
    (interactionType: any) => {
      store.set('openMethod', interactionType);
    },
  );

  const rootTriggerProps = store.useState('triggerProps', isMountedByThisTrigger.value);

  const {getButtonProps, buttonRef} = useButton({
    disabled,
    native: nativeButton,
  });

  const stateAttributesMapping: any = {
    open(value: boolean) {
      if (value && openReason.value === REASONS.triggerPress) {
        return pressableTriggerOpenStateMapping.open(value);
      }
      return triggerOpenStateMapping.open(value);
    },
  };

  const {preFocusGuardRef, handlePreFocusGuardFocus, handleFocusTargetFocus} = useTriggerFocusGuards(
    store,
    triggerElementRef,
  );

  const state: PopoverTriggerState = {
    disabled,
    open: isOpenedByThisTrigger.value,
  };

  const refs = [
    (el: HTMLElement | null) => {
      triggerElementRef.value = el;
    },
    buttonRef,
    registerTrigger,
  ] as any[];

  const propsList = [
    click.reference ?? EMPTY_OBJECT,
    hoverProps ?? EMPTY_OBJECT,
    rootTriggerProps.value,
    interactionTypeProps ?? EMPTY_OBJECT,
    {
      id: thisTriggerId,
      'aria-haspopup': 'dialog' as const,
      'aria-expanded': isOpenedByThisTrigger.value,
      'aria-controls': popupId.value,
    },
    elementProps,
    getButtonProps,
  ];

  return () => {
    const mergedPropsForRender = (() => {
      const merged = mergePropsN<any>([...propsList]);
      Object.assign(merged, stateAttributesMapping.open(isOpenedByThisTrigger.value));
      // 渲染期重算（propsList 在 setup 期构建，快照会过时）
      merged['aria-expanded'] = isOpenedByThisTrigger.value;
      return merged;
    })();

    const element = (
      <button {...mergedPropsForRender} ref={mergeRefs(refs)}>
        {children}
      </button>
    );

    // actview 渲染无法原地 patch 结构切换，始终使用稳定的 div 包裹结构。
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
  };
});

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
    children?: any;
    /**
     * Whether the component should ignore user interaction.
     * @default false
     */
    disabled?: boolean | undefined;
    /**
     * Whether the component renders a native `<button>` element when replacing it
     * via the `render` prop.
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
     * Whether the popover should also open when the trigger is hovered.
     * @default false
     */
    openOnHover?: boolean | undefined;
    /**
     * How long to wait before the popover may be opened on hover.
     * @default 300
     */
    delay?: number | undefined;
    /**
     * How long to wait before closing the popover that was opened on hover.
     * @default 0
     */
    closeDelay?: number | undefined;
  };

export namespace PopoverTrigger {
  export type State = PopoverTriggerState;
  export type Props<Payload = unknown> = PopoverTriggerProps<Payload>;
}
