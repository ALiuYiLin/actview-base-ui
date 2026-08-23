import { defineComponent, toValue, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useMeterRootContext } from '../root/MeterRootContext';
import type { MeterRootState } from '../root/MeterRoot';

/**
 * Visualizes the current value of the meter.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export const MeterIndicator = defineComponent(function (componentProps: MeterIndicator.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const rootContextRef = useMeterRootContext();

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, style, ...elementProps} = componentProps;

    const {percentageValue} = rootContextRef.value;

    const indicatorStyle: Record<string, any> = {
      insetInlineStart: 0,
      height: 'inherit',
      width: `${percentageValue}%`,
    };

    const merged: HTMLProps = {};
    Object.assign(merged, {style: indicatorStyle}, elementProps);
    if (typeof className === 'function') {
      merged.className = className({});
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = Object.assign({}, indicatorStyle, style({}));
    } else if (style !== undefined) {
      merged.style = Object.assign({}, indicatorStyle, style);
    }

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ref: rootRef} as any);
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof merged.className === 'string' && typeof renderClassName === 'string'
          ? `${merged.className} ${renderClassName}`.trim()
          : (merged.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
    }
    return <div {...merged} ref={rootRef} />;
  };
}) as unknown as (props: MeterIndicator.Props) => JSX.Element;

export interface MeterIndicatorState extends MeterRootState {}

export interface MeterIndicatorProps extends BaseUIComponentProps<'div', MeterIndicatorState> {}

export namespace MeterIndicator {
  export type State = MeterIndicatorState;
  export type Props = MeterIndicatorProps;
}
