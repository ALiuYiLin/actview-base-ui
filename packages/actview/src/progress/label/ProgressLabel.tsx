import { defineComponent, toValue, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useProgressRootContext } from '../root/ProgressRootContext';
import { progressStateAttributesMapping } from '../root/stateAttributesMapping';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { useLabel } from '@/internals/labelable-provider/useLabel';
import type { ProgressRootState } from '../root/ProgressRoot';

/**
 * A label for the progress bar.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export const ProgressLabel = defineComponent(function (componentProps: ProgressLabel.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const rootContextRef = useProgressRootContext();

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, style, ...elementProps} = componentProps;
    const elementPropsWithoutId = elementProps as typeof elementProps & {id?: string | undefined};
    delete elementPropsWithoutId.id;

    const {state, setLabelId} = rootContextRef.value;

    const labelProps = useLabel({
      setLabelId: setLabelId as any,
    });

    const stateValue = state;
    const stateAttributes = getStateAttributesProps(stateValue, progressStateAttributesMapping);

    const merged: HTMLProps = {};
    Object.assign(merged, labelProps, elementPropsWithoutId, stateAttributes);
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
    return <div {...merged} ref={rootRef}>{componentProps.children}</div>;
  };
}) as unknown as (props: ProgressLabel.Props) => JSX.Element;

export interface ProgressLabelState extends ProgressRootState {}

export interface ProgressLabelProps
  extends Omit<BaseUIComponentProps<'div', ProgressLabelState>, 'id'> {}

export namespace ProgressLabel {
  export type State = ProgressLabelState;
  export type Props = ProgressLabelProps;
}
