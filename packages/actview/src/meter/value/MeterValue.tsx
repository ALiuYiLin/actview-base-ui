import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useMeterRootContext } from '../root/MeterRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Displays the current value of the meter.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export function MeterValue(componentProps: MeterValue.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootContext = useMeterRootContext();

  // 值形 props toRefs 活引用；children（render-prop 函数）单独引用——渲染期
  // 求值后作为元素 children（函数形态传 (formattedValue, value)，否则展示
  // 格式化文本）。
  const { className, render, style, children: childrenRef, ...elementRefs } = toRefs(
    componentProps,
  ) as Record<string, Ref<any>>;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });
  const childrenValue = computed(() => {
    const {value, formattedValue} = rootContext;
    const childrenProp = childrenRef?.value;
    return typeof childrenProp === 'function'
      ? (childrenProp as any)(formattedValue, value)
      : formattedValue;
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'span',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: {},
          ref: componentProps.ref,
          props: [{'aria-hidden': true}, elementProps.value, {children: childrenValue.value}],
        },
      )}
    </>
  );
}

export interface MeterValueState extends MeterRootState {}

export interface MeterValueProps extends Omit<BaseUIComponentProps<'span', MeterValueState>, 'children'> {
  children?: null | ((formattedValue: string, value: number) => any) | undefined;
}

export namespace MeterValue {
  export type State = MeterValueState;
  export type Props = MeterValueProps;
}
