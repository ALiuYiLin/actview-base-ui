import { defineComponent, toValue, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useProgressRootContext } from '../root/ProgressRootContext';
import { progressStateAttributesMapping } from '../root/stateAttributesMapping';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import type { ProgressRootState } from '../root/ProgressRoot';

/**
 * Visualizes the current progress of the progress bar.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export const ProgressIndicator = defineComponent(function (
  componentProps: ProgressIndicator.Props,
) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const rootContextRef = useProgressRootContext();

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, style, ...elementProps} = componentProps;

    const {percentageValue, state} = rootContextRef.value;

    const indicatorStyle: Record<string, any> =
      percentageValue == null
        ? {}
        : {
            insetInlineStart: 0,
            height: 'inherit',
            width: `${percentageValue}%`,
          };

    const stateValue = state;
    const stateAttributes = getStateAttributesProps(stateValue, progressStateAttributesMapping);

    const merged: HTMLProps = {};
    Object.assign(merged, {style: indicatorStyle}, elementProps, stateAttributes);
    if (typeof className === 'function') {
      merged.className = className(stateValue);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = Object.assign({}, indicatorStyle, style(stateValue));
    } else if (style !== undefined) {
      merged.style = Object.assign({}, indicatorStyle, style);
    }

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...stateValue, ref: rootRef} as any);
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
}) as unknown as (props: ProgressIndicator.Props) => JSX.Element;

export interface ProgressIndicatorState extends ProgressRootState {}

export interface ProgressIndicatorProps
  extends BaseUIComponentProps<'div', ProgressIndicatorState> {}

export namespace ProgressIndicator {
  export type State = ProgressIndicatorState;
  export type Props = ProgressIndicatorProps;
}
