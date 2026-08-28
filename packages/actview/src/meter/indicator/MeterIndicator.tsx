import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import type { MeterRootState } from '../root/MeterRoot';
import { useMeterRootContext } from '../root/MeterRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Visualizes the current value of the meter.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export function MeterIndicator(componentProps: MeterIndicator.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：读字段即追踪。
  const rootContext = useMeterRootContext();

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
  const indicatorStyle = computed<Record<string, any>>(() => ({
    insetInlineStart: 0,
    height: 'inherit',
    width: `${rootContext.percentageValue}%`,
  }));
  const styleResolved = computed(() => {
    const resolved = typeof style?.value === 'function' ? style.value({}) : style?.value;
    return resolved === undefined
      ? indicatorStyle.value
      : Object.assign({}, indicatorStyle.value, resolved);
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'div',
        {
          className: className?.value,
          render: render?.value,
          style: styleResolved.value,
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

export interface MeterIndicatorState extends MeterRootState {}

export interface MeterIndicatorProps extends BaseUIComponentProps<'div', MeterIndicatorState> {}

export namespace MeterIndicator {
  export type State = MeterIndicatorState;
  export type Props = MeterIndicatorProps;
}
