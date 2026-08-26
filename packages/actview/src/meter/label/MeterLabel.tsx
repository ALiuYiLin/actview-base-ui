import { toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useMeterRootContext } from '../root/MeterRootContext';
import { useLabel } from '@/internals/labelable-provider/useLabel';
import type { MeterRootState } from '../root/MeterRoot';
import { useRenderElement } from '@/internals/useRenderElement';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

/**
 * A label for the meter.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export function MeterLabel(componentProps: MeterLabel.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();

  const rootContextRef = useMeterRootContext();

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {render, className, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => {
      const {setLabelId} = rootContextRef.value;

      const labelProps = useLabel({
        setLabelId: setLabelId as any,
      });

      // Keep label id derived from the root and ignore runtime `id` overrides from untyped consumers.
      const elementPropsWithoutId = {...unrefs(elementProps)} as any;
      delete elementPropsWithoutId.id;

      return [labelProps, elementPropsWithoutId];
    },
    state: () => ({}),
    className,
    style,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface MeterLabelState extends MeterRootState {}

export interface MeterLabelProps extends Omit<BaseUIComponentProps<'div', MeterLabelState>, 'id'> {}

export namespace MeterLabel {
  export type State = MeterLabelState;
  export type Props = MeterLabelProps;
}
