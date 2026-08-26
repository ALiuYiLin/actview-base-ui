import { toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useProgressRootContext } from '../root/ProgressRootContext';
import { progressStateAttributesMapping } from '../root/stateAttributesMapping';
import type { ProgressRootState } from '../root/ProgressRoot';
import { useRenderElement } from '@/internals/useRenderElement';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

/**
 * Visualizes the current progress of the progress bar.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export function ProgressIndicator(componentProps: ProgressIndicator.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();

  const rootContextRef = useProgressRootContext();

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {render, className, style, children, ...elementProps} = toRefs(componentProps);

  const stateFn = () => rootContextRef.value.state;

  const {element} = useRenderElement({
    props: () => {
      const {percentageValue} = rootContextRef.value;

      const indicatorStyle: Record<string, any> =
        percentageValue == null
          ? {}
          : {
              insetInlineStart: 0,
              height: 'inherit',
              width: `${percentageValue}%`,
            };

      const merged: any = {style: indicatorStyle, ...unrefs(elementProps)};
      const resolvedStyle =
        typeof style?.value === 'function' ? style.value(stateFn()) : style?.value;
      if (resolvedStyle !== undefined) {
        merged.style = Object.assign({}, indicatorStyle, resolvedStyle);
      }
      return [merged];
    },
    state: stateFn,
    stateAttributesMapping: progressStateAttributesMapping as any,
    className,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface ProgressIndicatorState extends ProgressRootState {}

export interface ProgressIndicatorProps
  extends BaseUIComponentProps<'div', ProgressIndicatorState> {}

export namespace ProgressIndicator {
  export type State = ProgressIndicatorState;
  export type Props = ProgressIndicatorProps;
}
