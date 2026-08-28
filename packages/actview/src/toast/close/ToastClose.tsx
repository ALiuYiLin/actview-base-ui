import {computed, toRefs} from 'actview';
import type { Ref } from 'actview';import { useToastRootContext } from '../root/ToastRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** A button that closes the toast. Renders a `<button>` element. */
export function ToastClose(props: ToastClose.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const context = useToastRootContext(false)!;

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(props) as Record<string, Ref<any>>;
  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });
  const rootProps = computed<Record<string, any>>(() => ({
    type: 'button' as const,
    onClick() {
      context.close();
    },
    ...elementProps.value,
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
          ref: props.ref as any,
          props: rootProps.value,
        },
      )}
    </>
  );
}
export interface ToastCloseProps {
  children?: any;
  [key: string]: any;
}

export namespace ToastClose {
  export type Props = ToastCloseProps;
}