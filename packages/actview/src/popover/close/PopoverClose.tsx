import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { useButton } from '@/internals/use-button/useButton';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * A button that closes the popover.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverClose(componentProps: PopoverClose.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const disabled = computed(() => componentProps.disabled ?? false);
  const nativeButton = computed(() => componentProps.nativeButton ?? true);

  const {buttonRef, getButtonProps} = useButton({
    disabled,
    focusableWhenDisabled: false,
    native: nativeButton.value,
  });

  const store = usePopoverRootContext(false)!;

  // 事件 handler：setup 闭包读 store——事件触发时拿到实时值。
  const handleClose = (event: any) => {
    store.setOpen(
      false,
      createChangeEventDetails(REASONS.closePress, event.nativeEvent ?? event),
    );
  };

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

  // 根元素 props：close handler → 透传 → getButtonProps。
  const rootProps = computed<Record<string, any>>(() => ({
    onClick: handleClose,
    ...elementProps.value,
    ...(getButtonProps ?? {}),
  }));

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
          ref: useMergedRefs(buttonRef as any, componentProps.ref as any),
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface PopoverCloseState {}

export interface PopoverCloseProps
  extends NativeButtonProps,
    BaseUIComponentProps<'button', PopoverCloseState> {
  children?: any;
  [key: string]: any;
}

export namespace PopoverClose {
  export type State = PopoverCloseState;
  export type Props = PopoverCloseProps;
}
