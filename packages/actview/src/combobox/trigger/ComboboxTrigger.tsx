import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/** The trigger of the combobox. Renders a `<button>` element. */
export function ComboboxTrigger(componentProps: ComboboxTrigger.Props) {
  // ============ setup（只执行一次）：值形 props toRefs 活引用 ============
  // children 不解构、随 elementRefs 流入渲染元素。
  const context = useComboboxRootContext(false);
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;
  // useState 必须在 setup 调用（useStore 内部注册 onUnmounted）。
  const open = context.store.useState('open');

  const triggerRef = (el: any) => {
    context.store.setTriggerElement(el ?? null);
  };

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  // 根元素 props：触发语义 + 透传。
  const rootProps = computed<Record<string, any>>(() => {
    const disabled = context.store.state.disabled;
    return {
      type: 'button',
      'aria-expanded': open.value,
      'aria-haspopup': 'listbox',
      ...elementProps.value,
      disabled,
      onClick: () => {
        if (!disabled) {
          context.store.toggleOpen();
        }
      },
    };
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
          ref: useMergedRefs(triggerRef, componentProps.ref as any),
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface ComboboxTriggerProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxTrigger {
  export type Props = ComboboxTriggerProps;
}
