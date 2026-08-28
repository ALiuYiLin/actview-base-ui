import { computed, ref, toRefs } from 'actview';
import type { Ref } from 'actview';
import { usePreviewCardRootContext } from '../root/PreviewCardRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import { triggerOpenStateMapping } from '@/utils/popupStateMapping';
import { mergePropsN } from '@/merge-props';
import { usePopupHandleStore, useTriggerDataForwarding } from '@/utils/popups';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { PreviewCardHandle } from '../store/PreviewCardHandle';
import { useHoverReferenceInteraction, useFocus } from '@/floating-ui-react';
import { useButton } from '@/internals/use-button/useButton';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * An element to attach the preview-card to.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI PreviewCard](https://base-ui.com/react/components/preview-card)
 */
export function PreviewCardTrigger(componentProps: PreviewCardTrigger.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const disabled = computed(() => componentProps.disabled ?? false);
  const nativeButton = computed(() => componentProps.nativeButton ?? true);

  const previewCardHandleStore = usePopupHandleStore(componentProps.handle as any);
  const handleStore = previewCardHandleStore.value;
  const rootStore = usePreviewCardRootContext(true);

  const store: any = handleStore ?? rootStore;

  if (store === undefined) {
    throw new Error(
      'Base UI: <PreviewCard.Trigger> must be either used within a <PreviewCard.Root> component or provided with a handle.',
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

  const focusProps = useFocus(floatingContext.value, {enabled: !disabled.value}).reference;

  const {getButtonProps, buttonRef} = useButton({
    disabled,
    native: nativeButton.value,
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

  // 根元素 props：hover/focus 处理器 → id → 透传 → getButtonProps → open/
  // disabled state data-*。
  const rootProps = computed<Record<string, any>>(() => {
    const merged: any = mergePropsN([
      hoverProps ?? {},
      focusProps ?? {},
      {id: thisTriggerId},
      elementProps.value,
      getButtonProps,
    ]);
    const openAttr = triggerOpenStateMapping.open(isOpenedByThisTrigger.value);
    if (openAttr) {
      Object.assign(merged, openAttr);
    }
    if (disabled.value) {
      merged['data-disabled'] = '';
    } else {
      delete merged['data-disabled'];
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
          state: {
            open: isOpenedByThisTrigger.value,
            disabled: disabled.value,
          },
          ref: useMergedRefs(triggerElementRef, buttonRef, componentProps.ref as any),
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface PreviewCardTriggerState {
  /**
   * Whether the preview-card is currently open.
   */
  open: boolean;
  /**
   * Whether the trigger is currently disabled.
   */
  disabled: boolean;
}

export interface PreviewCardTriggerProps extends BaseUIComponentProps<'button', PreviewCardTriggerState> {
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

export namespace PreviewCardTrigger {
  export type State = PreviewCardTriggerState;
  export type Props = PreviewCardTriggerProps;
}
