import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useProgressRootContext } from '../root/ProgressRootContext';
import { progressStateAttributesMapping } from '../root/stateAttributesMapping';
import { useLabel } from '@/internals/labelable-provider/useLabel';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * A label for the progress bar.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export function ProgressLabel(componentProps: ProgressLabel.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootContext = useProgressRootContext();

  // useLabel 必须在 setup 调用（useRegisteredLabelId 含 watch/computed/
  // onUnmounted——渲染期调用会每次渲染累积副作用）。
  // setLabelId 是 Root 的稳定函数（setup 定义一次），setup 快照安全。
  const {setLabelId} = rootContext;
  const labelProps = useLabel({
    setLabelId: setLabelId as any,
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
    // label 的 id 关联由 labelProps 承担——透传的自定义 id 排除。
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
          state: rootContext.state,
          stateAttributesMapping: progressStateAttributesMapping,
          ref: componentProps.ref,
          props: [labelProps, elementProps.value],
        },
      )}
    </>
  );
}

export interface ProgressLabelState extends ProgressRootState {}

export interface ProgressLabelProps
  extends Omit<BaseUIComponentProps<'div', ProgressLabelState>, 'id'> {}

export namespace ProgressLabel {
  export type State = ProgressLabelState;
  export type Props = ProgressLabelProps;
}
