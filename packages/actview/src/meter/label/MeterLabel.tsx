import { defineComponent, toValue, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useMeterRootContext } from '../root/MeterRootContext';
import { useLabel } from '@/internals/labelable-provider/useLabel';
import type { MeterRootState } from '../root/MeterRoot';

/**
 * A label for the meter.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export const MeterLabel = defineComponent(function (componentProps: MeterLabel.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const rootContextRef = useMeterRootContext();

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, style, ...elementProps} = componentProps;
    const elementPropsWithoutId = elementProps as typeof elementProps & {id?: string | undefined};
    delete elementPropsWithoutId.id;

    const {setLabelId} = rootContextRef.value;

    const labelProps = useLabel({
      setLabelId: setLabelId as any,
    });

    const merged: HTMLProps = {};
    Object.assign(merged, labelProps, elementPropsWithoutId);
    if (typeof className === 'function') {
      merged.className = className({});
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = style({});
    } else if (style !== undefined) {
      merged.style = style;
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
    return <div {...merged} ref={rootRef}>{componentProps.children}</div>;
  };
}) as unknown as (props: MeterLabel.Props) => JSX.Element;

export interface MeterLabelState extends MeterRootState {}

export interface MeterLabelProps extends Omit<BaseUIComponentProps<'div', MeterLabelState>, 'id'> {}

export namespace MeterLabel {
  export type State = MeterLabelState;
  export type Props = MeterLabelProps;
}
