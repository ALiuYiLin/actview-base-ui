import { computed, ref, toRefs } from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import type { NumberFieldRootState } from '../root/NumberFieldRoot';
import { useNumberFieldRootContext } from '../root/NumberFieldRootContext';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * Groups the interactive parts of the number field.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Number Field](https://base-ui.com/react/components/number-field)
 */
export function NumberFieldGroup(componentProps: NumberFieldGroup.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 ref：经 params.ref 合并链透传（不用 useRootElementFragment）。
  const rootRef = ref(null as HTMLDivElement | null);

  const rootContext = useNumberFieldRootContext();

  // ============ setup：值形 props toRefs 活引用 ============
  // children 不解构、随 elementRefs 流入渲染元素。
  const { className, render, style, ...elementRefs } = toRefs(componentProps) as Record<
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
          state: rootContext.state,
          stateAttributesMapping: stateAttributesMapping as any,
          ref: useMergedRefs(rootRef, componentProps.ref as any),
          props: [{role: 'group'}, elementProps.value],
        },
      )}
    </>
  );
}

export interface NumberFieldGroupState extends NumberFieldRootState {}

export interface NumberFieldGroupProps extends BaseUIComponentProps<'div', NumberFieldGroupState> {}

export namespace NumberFieldGroup {
  export type State = NumberFieldGroupState;
  export type Props = NumberFieldGroupProps;
}
