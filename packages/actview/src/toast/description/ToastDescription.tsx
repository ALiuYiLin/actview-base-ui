import {computed, toRefs} from 'actview';
import type { Ref } from 'actview';import { useToastRootContext } from '../root/ToastRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** The description of the toast. Renders a `<div>` element. */
export function ToastDescription(props: ToastDescription.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const context = useToastRootContext(false)!;

  // 值形 props toRefs 活引用；children 单独排除（回退 toast.description）。
  const { className, render, style, children: childrenRef, ...elementRefs } = toRefs(props) as Record<string, Ref<any>>;
  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });
  const state = computed(() => context.toast);

  const rootProps = computed<Record<string, any>>(() => ({
    ...elementProps.value,
    children: childrenRef?.value ?? context.toast.description,
  }));
  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          ref: props.ref as any,
          props: rootProps.value,
        },
      )}
    </>
  );
}
export interface ToastDescriptionProps {
  children?: any;
  [key: string]: any;
}

export namespace ToastDescription {
  export type Props = ToastDescriptionProps;
}