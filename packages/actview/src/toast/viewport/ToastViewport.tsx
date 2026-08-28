import { useMergedRefs } from '@/internals/useMergedRefs';
import {computed, toRefs} from 'actview';
import type { Ref } from 'actview';
import { useToastProviderContext } from '../provider/ToastProviderContext';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * A container viewport for toasts.
 * Renders a `<div>` element.
 *
 * actview 简化：children 为渲染函数 `(toast, index) => ReactNode`；
 * 布局元数据（offsetY/height）未迁移。
 */
export function ToastViewport(componentProps: ToastViewport.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const store = useToastProviderContext(false)!;
  const toasts = store.useState('toasts');

  // 值形 props toRefs 活引用；children 单独排除（render prop）。
  const { className, render, style, children: childrenRef, ...elementRefs } = toRefs(
    componentProps,
  ) as Record<string, Ref<any>>;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  const rootProps = computed<Record<string, any>>(() => ({...elementProps.value}));

  // children 兼容 render prop（渲染期逐 toast 调用）。
  const content = computed(() => {
    const childFn = childrenRef?.value;
    if (typeof childFn === 'function') {
      return toasts.value.map((toast: any, index: number) => childFn(toast, index));
    }
    return childFn ?? null;
  });

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
          ref: useMergedRefs(
            (el: HTMLDivElement | null) => {
              store.state.viewport = el;
            },
            componentProps.ref as any,
          ),
          props: rootProps.value,
        },
      )}
    </>
  );
}

export interface ToastViewportState {}

export interface ToastViewportProps {
  children?: any;
  [key: string]: any;
}

export namespace ToastViewport {
  export type State = ToastViewportState;
  export type Props = ToastViewportProps;
}