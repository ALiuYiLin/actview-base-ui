import {computed, toRefs} from 'actview';
import type { Ref } from 'actview';import { useToastRootContext } from '../root/ToastRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** Positions the toast. Renders a `<div>` element. actview 简化：无定位计算。 */
export function ToastPositioner(props: ToastPositioner.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const context = useToastRootContext(true)!;

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(props) as Record<string, Ref<any>>;
  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });
  const rootProps = computed<Record<string, any>>(() => ({
    ...(context?.toast?.positionerProps ?? {}),
    ...elementProps.value,
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
export interface ToastPositionerProps {
  children?: any;
  [key: string]: any;
}

export namespace ToastPositioner {
  export type Props = ToastPositionerProps;
}