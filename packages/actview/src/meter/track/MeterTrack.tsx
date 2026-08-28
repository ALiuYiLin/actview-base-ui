import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useMeterRootContext } from '../root/MeterRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Contains the meter indicator.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export function MeterTrack(componentProps: MeterTrack.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 消费 context 以保持存在性检查（React 版 useRenderElement 无 state）。
  const rootContext = useMeterRootContext();
  void rootContext;

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  const { render, className, style, ...elementRefs } = toRefs(componentProps) as Record<
    string,
    Ref<any>
  >;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
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
          props: elementProps.value,
        },
      )}
    </>
  );
}

export interface MeterTrackState extends MeterRootState {}

export interface MeterTrackProps extends BaseUIComponentProps<'div', MeterTrackState> {}

export namespace MeterTrack {
  export type State = MeterTrackState;
  export type Props = MeterTrackProps;
}
