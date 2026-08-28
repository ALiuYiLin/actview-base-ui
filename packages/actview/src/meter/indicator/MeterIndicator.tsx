import { toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useMeterRootContext } from '../root/MeterRootContext';
import type { MeterRootState } from '../root/MeterRoot';
import { useRenderElement } from '@/internals/useRenderElementLegacy';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

/**
 * Visualizes the current value of the meter.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export function MeterIndicator(componentProps: MeterIndicator.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();

  const rootContextRef = useMeterRootContext();

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {render, className, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => {
      const {percentageValue} = rootContextRef.value;

      const indicatorStyle: Record<string, any> = {
        insetInlineStart: 0,
        height: 'inherit',
        width: `${percentageValue}%`,
      };

      const merged: any = {style: indicatorStyle, ...unrefs(elementProps)};
      const resolvedStyle = typeof style?.value === 'function' ? style.value({}) : style?.value;
      if (resolvedStyle !== undefined) {
        merged.style = Object.assign({}, indicatorStyle, resolvedStyle);
      }
      return [merged];
    },
    state: () => ({}),
    className,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface MeterIndicatorState extends MeterRootState {}

export interface MeterIndicatorProps extends BaseUIComponentProps<'div', MeterIndicatorState> {}

export namespace MeterIndicator {
  export type State = MeterIndicatorState;
  export type Props = MeterIndicatorProps;
}
