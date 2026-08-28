import { computed, ref, toRefs } from 'actview';
import type { Ref } from 'actview';
import { useDialogRootContext } from '../root/DialogRootContext';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { triggerOpenStateMapping } from '@/utils/popupStateMapping';
import { mergePropsN } from '@/merge-props';
import { usePopupHandleStore, useTriggerDataForwarding } from '@/utils/popups';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { DialogHandle } from '../store/DialogHandle';
import { useClick } from '@/floating-ui-react';
import { useButton } from '@/internals/use-button/useButton';
import { useTriggerFocusGuards } from '@/utils/popups/useTriggerFocusGuards';
import { FocusGuard } from '@/utils/FocusGuard';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * A button that opens the dialog.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export function DialogTrigger(componentProps: DialogTrigger.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const disabled = computed(() => componentProps.disabled ?? false);
  const nativeButton = computed(() => componentProps.nativeButton ?? true);

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  const dialogHandleStore = usePopupHandleStore(componentProps.handle as any);
  const handleStore = dialogHandleStore.value;
  const rootStore = useDialogRootContext(true);

  const store: any = handleStore ?? rootStore;

  if (store === undefined) {
    throw new Error(
      'Base UI: <Dialog.Trigger> must be either used within a <Dialog.Root> component or provided with a handle.',
    );
  }

  const thisTriggerId = useBaseUiId(componentProps.id);
  const triggerElementRef = ref<HTMLElement | null>(null);

  const {registerTrigger, isMountedByThisTrigger} = useTriggerDataForwarding(
    thisTriggerId as any,
    triggerElementRef as any,
    store,
    {disabled} as any,
  );

  const floatingContext = store.useState('floatingRootContext');
  const isOpenedByThisTrigger = store.useState('isOpenedByTrigger', thisTriggerId as any);

  const click = useClick(floatingContext.value, {enabled: !disabled.value, event: 'mousedown'});

  const {getButtonProps, buttonRef} = useButton({
    disabled,
    native: nativeButton.value,
  });

  const {preFocusGuardRef, handlePreFocusGuardFocus, handleFocusTargetFocus} =
    useTriggerFocusGuards(store, triggerElementRef);

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  // 根元素 props：click 处理器 → id/aria → 透传 → getButtonProps → open/
  // disabled state data-*。
  const rootProps = computed<Record<string, any>>(() => {
    const merged: any = mergePropsN<any>([
      click.reference ?? {},
      {
        id: thisTriggerId,
        'aria-haspopup': 'dialog' as const,
      },
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

export interface DialogTriggerState {
  /**
   * Whether the dialog is currently open.
   */
  open: boolean;
  /**
   * Whether the trigger is currently disabled.
   */
  disabled: boolean;
}

export interface DialogTriggerProps
  extends NativeButtonProps,
    BaseUIComponentProps<'button', DialogTriggerState> {
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
  [key: string]: any;
}

export namespace DialogTrigger {
  export type State = DialogTriggerState;
  export type Props = DialogTriggerProps;
}
