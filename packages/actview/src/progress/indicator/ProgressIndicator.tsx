import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import type { ProgressRootState } from '../root/ProgressRoot';
import { useProgressRootContext } from '../root/ProgressRootContext';
import { progressStateAttributesMapping } from '../root/stateAttributesMapping';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Visualizes the current progress of the progress bar.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export function ProgressIndicator(componentProps: ProgressIndicator.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：读字段即追踪。
  const rootContext = useProgressRootContext();

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
  const state = computed(() => rootContext.state);
  const indicatorStyle = computed<Record<string, any>>(() =>
    rootContext.percentageValue == null
      ? {}
      : {
          insetInlineStart: 0,
          height: 'inherit',
          width: `${rootContext.percentageValue}%`,
        },
  );
  // 用户 style（string/对象/函数）与 indicator 定位样式合并——hook 内
  // mergeObjects(样式表) 语义与 React 契约一致（用户覆盖同名键）。
  const styleResolved = computed(() => {
    const resolved = typeof style?.value === 'function' ? style.value(state.value) : style?.value;
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
          state: state.value,
          stateAttributesMapping: progressStateAttributesMapping,
          ref: componentProps.ref,
          props: elementProps.value,
        },
      )}
    </>
  );
}

export interface ProgressIndicatorState extends ProgressRootState {}

export interface ProgressIndicatorProps
  extends BaseUIComponentProps<'div', ProgressIndicatorState> {}

export namespace ProgressIndicator {
  export type State = ProgressIndicatorState;
  export type Props = ProgressIndicatorProps;
}
