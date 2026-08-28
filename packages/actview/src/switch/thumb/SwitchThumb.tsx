import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useSwitchRootContext } from '../root/SwitchRootContext';
import { stateAttributesMapping } from '../stateAttributesMapping';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * Visualizes the "on" or "off" state of the switch.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Switch](https://base-ui.com/react/components/switch)
 */
export function SwitchThumb(componentProps: SwitchThumb.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：读字段即追踪。
  const rootContext = useSwitchRootContext();

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
  const stateAttributes = computed(() =>
    getStateAttributesProps(rootContext, stateAttributesMapping),
  );

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
          state: rootContext,
          stateAttributesMapping,
          ref: componentProps.ref,
          props: {...elementProps.value, ...stateAttributes.value},
        },
      )}
    </>
  );
}

export interface SwitchThumbProps extends BaseUIComponentProps<'span', SwitchThumbState> {}

export interface SwitchThumbState extends SwitchRootState {}

export namespace SwitchThumb {
  export type Props = SwitchThumbProps;
  export type State = SwitchThumbState;
}
