import { computed, ref, toRefs } from 'actview';
import type { Ref } from 'actview';
import { useTooltipRootContext } from '../root/TooltipRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import { triggerOpenStateMapping } from '@/utils/popupStateMapping';
import { mergePropsN } from '@/merge-props';
import { usePopupHandleStore, useTriggerDataForwarding } from '@/utils/popups';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { TooltipHandle } from '../store/TooltipHandle';
import { useHoverReferenceInteraction, useFocus } from '@/floating-ui-react';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

// 对齐 React 参考：trigger 标识（浮层交互/外部查询用，M2-原语-4）。
const TOOLTIP_TRIGGER_IDENTIFIER = 'data-base-ui-tooltip-trigger';

/**
 * An element to attach the tooltip to.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Tooltip](https://base-ui.com/react/components/tooltip)
 */
export function TooltipTrigger(componentProps: TooltipTrigger.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const disabled = computed(() => componentProps.disabled ?? false);

  const tooltipHandleStore = usePopupHandleStore(componentProps.handle as any);
  const handleStore = tooltipHandleStore.value;
  const rootStore = useTooltipRootContext(true);

  const store: any = handleStore ?? rootStore;

  if (store === undefined) {
    throw new Error(
      'Base UI: <Tooltip.Trigger> must be either used within a <Tooltip.Root> component or provided with a handle.',
    );
  }

  const thisTriggerId = useBaseUiId(componentProps.id);
  const triggerElementRef = ref<HTMLElement | null>(null);

  const {registerTrigger, isMountedByThisTrigger} = useTriggerDataForwarding(
    thisTriggerId as any,
    triggerElementRef as any,
    store,
    {
      payload: componentProps.payload,
      disabled,
      closeDelay: componentProps.closeDelay,
    } as any,
  );

  const floatingContext = store.useState('floatingRootContext');
  const isOpenedByThisTrigger = store.useState('isOpenedByTrigger', thisTriggerId as any);

  const hoverProps = useHoverReferenceInteraction(floatingContext.value, {
    enabled: !disabled.value,
    mouseOnly: true,
    move: false,
    triggerElementRef: triggerElementRef as any,
    isActiveTrigger: isOpenedByThisTrigger.value,
    isClosing: () => store.select('transitionStatus') === 'ending',
  });

  const focusProps = useFocus(floatingContext.value, {
    enabled: !disabled.value,
  }).reference;

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

  // 根元素 props：hover/focus 处理器 → id → 透传 → open state data-*。
  // 对齐 React 参考：不用 useButton（button 的 type 由 useRenderElement 提供），
  // 避免多出 tabindex="0"（M2-原语-4）。
  const rootProps = computed<Record<string, any>>(() => {
    const merged: any = mergePropsN([
      hoverProps ?? {},
      focusProps ?? {},
      {id: thisTriggerId},
      elementProps.value,
    ]);
    const openAttr = triggerOpenStateMapping.open(isOpenedByThisTrigger.value);
    if (openAttr) {
      Object.assign(merged, openAttr);
    }
    if (disabled.value) {
      merged['data-trigger-disabled'] = '';
      merged[TOOLTIP_TRIGGER_IDENTIFIER] = undefined;
    } else {
      delete merged['data-trigger-disabled'];
      merged[TOOLTIP_TRIGGER_IDENTIFIER] = '';
    }
    return merged;
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'button',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          ref: useMergedRefs(triggerElementRef, componentProps.ref as any),
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface TooltipTriggerState {
  /**
   * Whether the tooltip is currently open.
   */
  open: boolean;
  /**
   * Whether the trigger is currently disabled.
   */
  disabled: boolean;
}

export interface TooltipTriggerProps extends BaseUIComponentProps<'button', TooltipTriggerState> {
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
   * The payload of the trigger.
   */
  payload?: unknown;
  [key: string]: any;
}

export namespace TooltipTrigger {
  export type State = TooltipTriggerState;
  export type Props = TooltipTriggerProps;
}
