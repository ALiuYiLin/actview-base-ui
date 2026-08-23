import { defineComponent, toValue, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useProgressRootContext } from '../root/ProgressRootContext';
import { progressStateAttributesMapping } from '../root/stateAttributesMapping';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import type { ProgressRootState } from '../root/ProgressRoot';

/**
 * Displays the current value of the progress bar.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export const ProgressValue = defineComponent(function (componentProps: ProgressValue.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const rootContextRef = useProgressRootContext();

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {className, render, children, style, ...elementProps} = componentProps;

    const {value, formattedValue, state} = rootContextRef.value;

    // Follow `status` rather than re-deriving it: a non-finite `value` is also indeterminate, and
    // has no formatted text to show.
    const indeterminate = state.status === 'indeterminate';
    const formattedValueArg = indeterminate ? 'indeterminate' : formattedValue;
    const formattedValueDisplay = indeterminate ? null : formattedValue;

    const stateValue = state;
    const stateAttributes = getStateAttributesProps(stateValue, progressStateAttributesMapping);

    const merged: HTMLProps = {};
    Object.assign(
      merged,
      {
        'aria-hidden': true,
        children:
          typeof children === 'function'
            ? (children as any)(formattedValueArg, value)
            : formattedValueDisplay,
      },
      elementProps,
      stateAttributes,
    );
    if (typeof className === 'function') {
      merged.className = className(stateValue);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = style(stateValue);
    } else if (style !== undefined) {
      merged.style = style;
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
    return <span {...merged} ref={rootRef} />;
  };
}) as unknown as (props: ProgressValue.Props) => JSX.Element;

export interface ProgressValueState extends ProgressRootState {}

export interface ProgressValueProps
  extends Omit<BaseUIComponentProps<'span', ProgressValueState>, 'children'> {
  children?:
    | null
    | ((formattedValue: string | null, value: number | null) => any)
    | undefined;
}

export namespace ProgressValue {
  export type State = ProgressValueState;
  export type Props = ProgressValueProps;
}
