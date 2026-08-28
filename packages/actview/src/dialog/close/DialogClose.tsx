import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { useDialogRootContext } from '../root/DialogRootContext';
import { useButton } from '@/internals/use-button/useButton';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * A button that closes the dialog.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export function DialogClose(componentProps: DialogClose.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 渲染期/事件期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const disabled = computed(() => componentProps.disabled ?? false);
  const nativeButton = computed(() => componentProps.nativeButton ?? true);

  // onClick 单独排除（handler 内事件期调用，避免与内置 close 重复触发）。
  const { className, render, style, onClick: userOnClickRef, ...elementRefs } = toRefs(
    componentProps,
  ) as Record<string, Ref<any>>;

  const {buttonRef, getButtonProps} = useButton({
    disabled,
    focusableWhenDisabled: false,
    native: nativeButton.value,
  });

  const store = useDialogRootContext(false)!;

  // 事件 handler：setup 闭包读 computed/refs——事件触发时拿到实时值。
  const handleClick = (event: any) => {
    if (disabled.value) {
      return;
    }
    userOnClickRef?.value?.(event);
    if (!event.defaultPrevented && !event.baseUIHandlerPrevented) {
      store.setOpen(
        false,
        createChangeEventDetails(REASONS.closePress, event.nativeEvent ?? event),
      );
    }
  };

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  // 根元素 props：getButtonProps → close handler → 透传 → disabled state
  // data-*（actview 的 useButton 不产出原生 disabled，渲染期补写）。
  const rootProps = computed<Record<string, any>>(() => {
    const merged: any = {
      ...(getButtonProps ?? {}),
      onClick: handleClick,
      ...elementProps.value,
    };

    if (disabled.value) {
      if (nativeButton.value) {
        merged.disabled = true;
      }
      merged['data-disabled'] = '';
    } else {
      delete merged.disabled;
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
          ref: useMergedRefs(buttonRef as any, componentProps.ref as any),
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface DialogCloseState {}

export interface DialogCloseProps
  extends NativeButtonProps,
    BaseUIComponentProps<'button', DialogCloseState> {
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

export namespace DialogClose {
  export type State = DialogCloseState;
  export type Props = DialogCloseProps;
}
