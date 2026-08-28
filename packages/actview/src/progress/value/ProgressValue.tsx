import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import type { ProgressRootState } from '../root/ProgressRoot';
import { useProgressRootContext } from '../root/ProgressRootContext';
import { progressStateAttributesMapping } from '../root/stateAttributesMapping';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Displays the current value of the progress bar.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export function ProgressValue(componentProps: ProgressValue.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootContext = useProgressRootContext();

  // 值形 props toRefs 活引用；children（render-prop 函数）单独引用——渲染期
  // 求值后作为元素 children（函数形态传 (formattedValue, value)，否则展示
  // 格式化文本；indeterminate 时无文本可展示）。
  const { className, render, style, children: childrenRef, ...elementRefs } = toRefs(
    componentProps,
  ) as Record<string, Ref<any>>;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });
  const state = computed(() => rootContext.state);
  const childrenValue = computed(() => {
    const {value, formattedValue, state: st} = rootContext;

    // Follow `status` rather than re-deriving it: a non-finite `value` is also indeterminate, and
    // has no formatted text to show.
    const indeterminate = st.status === 'indeterminate';
    const formattedValueArg = indeterminate ? 'indeterminate' : formattedValue;
    const formattedValueDisplay = indeterminate ? null : formattedValue;

    const childrenProp = childrenRef?.value;
    return typeof childrenProp === 'function'
      ? (childrenProp as any)(formattedValueArg, value)
      : formattedValueDisplay;
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
          state: state.value,
          stateAttributesMapping: progressStateAttributesMapping,
          ref: componentProps.ref,
          props: [{'aria-hidden': true}, elementProps.value, {children: childrenValue.value}],
        },
      )}
    </>
  );
}

export interface ProgressValueState extends ProgressRootState {}

export interface ProgressValueProps
  extends Omit<BaseUIComponentProps<'span', ProgressValueState>, 'children'> {
  children?:
    | null
    | ((formattedValue: string | null, value: number | null) => any)
    | undefined;
}

export namespace ProgressValue {
  export type State = ProgressValueState;
  export type Props = ProgressValueProps;
}
