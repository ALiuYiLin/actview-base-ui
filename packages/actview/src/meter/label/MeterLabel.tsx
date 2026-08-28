import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import type { MeterRootState } from '../root/MeterRoot';
import { useMeterRootContext } from '../root/MeterRootContext';
import { useLabel } from '@/internals/labelable-provider/useLabel';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * A label for the meter.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export function MeterLabel(componentProps: MeterLabel.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootContext = useMeterRootContext();

  // useLabel 必须在 setup 调用（useRegisteredLabelId 含 watch/computed/
  // onUnmounted——渲染期调用会每次渲染累积副作用）。
  // setLabelId 是 Root 的稳定函数（setup 定义一次），setup 快照安全；
  // id 用 computed 保持响应式（React 版每次 render 重算）。
  const {setLabelId} = rootContext;
  const labelProps = useLabel({
    setLabelId: setLabelId as any,
    id: computed(() => (componentProps as any).id),
  });

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { render, className, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    // Keep label id derived from the root and ignore runtime `id` overrides from untyped consumers.
    delete out.id;
    return out;
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
          state: {},
          ref: componentProps.ref,
          props: [labelProps, elementProps.value],
        },
      )}
    </>
  );
}

export interface MeterLabelState extends MeterRootState {}

export interface MeterLabelProps extends Omit<BaseUIComponentProps<'div', MeterLabelState>, 'id'> {}

export namespace MeterLabel {
  export type State = MeterLabelState;
  export type Props = MeterLabelProps;
}
