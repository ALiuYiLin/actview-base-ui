import { computed, ref, toRefs } from 'actview';
import type { Ref } from 'actview';
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
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

const OPEN_DELAY = 300;

/**
 * A button that opens the popover.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverTrigger(componentProps: PopoverTrigger.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const disabled = computed(() => componentProps.disabled ?? false);
  const nativeButton = computed(() => componentProps.nativeButton ?? true);

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  // 组件自定义 props（disabled/nativeButton/handle/payload/openOnHover/delay/
  // closeDelay）剔除——否则泄漏到 DOM（core 1.4.0 起 disabled 布尔属性会渲染）。
  const {
    className,
    render,
    style,
    disabled: _disabled,
    nativeButton: _nativeButton,
    handle: _handle,
    payload: _payload,
    openOnHover: _openOnHover,
    delay: _delay,
    closeDelay: _closeDelay,
    ...elementRefs
  } = toRefs(componentProps) as Record<string, Ref<any>>;

  const rootStore = usePopoverRootContext(true);
  const handleStore = usePopupHandleStore(componentProps.handle);
  const store: any = handleStore?.value ?? rootStore;
  if (!store) {
    throw new Error(
      'Base UI: <Popover.Trigger> must be either used within a <Popover.Root> component or provided with a handle.',
    );
  }

  const thisTriggerId = useBaseUiId(componentProps.id);
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
      payload: componentProps.payload,
      disabled,
      openOnHover: componentProps.openOnHover ?? false,
      closeDelay: componentProps.closeDelay ?? 0,
    } as any,
  );

  const openReason = store.useState('openChangeReason');
  const stickIfOpen = store.useState('stickIfOpen');
  const openMethod = store.useState('openMethod');

  const hoverProps = useHoverReferenceInteraction(floatingContext.value, {
    enabled:
      !disabled.value &&
      (componentProps.openOnHover ?? false) &&
      (openMethod.value !== 'touch' || openReason.value !== REASONS.triggerPress),
    mouseOnly: true,
    move: false,
    handleClose: safePolygon() as any,
    restMs: componentProps.delay ?? OPEN_DELAY,
    delay: {
      close: componentProps.closeDelay ?? 0,
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
    native: nativeButton.value,
  });

  const {preFocusGuardRef, handlePreFocusGuardFocus, handleFocusTargetFocus} = useTriggerFocusGuards(
    store,
    triggerElementRef,
  );

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const stateAttributesMapping: any = {
    open(value: boolean) {
      if (value && openReason.value === REASONS.triggerPress) {
        return pressableTriggerOpenStateMapping.open(value);
      }
      return triggerOpenStateMapping.open(value);
    },
  };

  // 根元素 props：click/hover 处理器 → store triggerProps → 交互类型 → id/aria
  // → 透传 → getButtonProps → open/disabled state data-*。
  const rootProps = computed<Record<string, any>>(() => {
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
      elementProps.value,
      getButtonProps,
    ];

    const merged = mergePropsN<any>([...propsList]);
    Object.assign(merged, stateAttributesMapping.open(isOpenedByThisTrigger.value));
    // 渲染期重算（propsList 在渲染期构建，保持实时）
    merged['aria-expanded'] = isOpenedByThisTrigger.value;
    if (disabled.value) {
      merged['data-disabled'] = '';
    } else {
      delete merged['data-disabled'];
    }
    return merged;
  });

  const state = computed(() => ({
    disabled: disabled.value,
    open: isOpenedByThisTrigger.value,
  }));

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // actview 渲染无法原地 patch 结构切换，始终使用稳定的 div 包裹结构。
  return (
    <div key={`${thisTriggerId}-guards`}>
      <FocusGuard
        ref={(el: any) => (preFocusGuardRef.value = el)}
        onFocus={handlePreFocusGuardFocus}
      />
      {useRenderElement(
        'button',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          ref: useMergedRefs(
            (el: HTMLElement | null) => {
              triggerElementRef.value = el;
            },
            buttonRef as any,
            registerTrigger as any,
            componentProps.ref as any,
          ),
          props: rootProps.value,
        },
      )}
      <FocusGuard
        ref={(el: any) => (store.context.triggerFocusTargetRef.value = el)}
        onFocus={handleFocusTargetFocus}
      />
    </div>
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
