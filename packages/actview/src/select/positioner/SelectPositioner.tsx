import { computed, toRefs } from 'actview';
import type { Ref } from 'actview';
import { useSelectRootContext } from '../root/SelectRootContext';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/** Positions the popup. Renders a `<div>` element. actview 简化：无定位计算。 */
export function SelectPositioner(props: SelectPositioner.Props) {
  // ============ setup（只执行一次）：值形 props toRefs 活引用 ============
  // children 不解构、随 elementRefs 流入渲染元素。
  const store = useSelectRootContext(false);
  const { className, render, style, ...elementRefs } = toRefs(props) as Record<
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
          ref: useMergedRefs(
            (el: any) => {
              store.setPositionerElement(el ?? null);
            },
            props.ref as any,
          ),
          props: [elementProps.value],
        },
      )}
    </>
  );
}

export interface SelectPositionerProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectPositioner {
  export type Props = SelectPositionerProps;
}
