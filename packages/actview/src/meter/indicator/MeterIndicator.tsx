import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import type { MeterRootState } from '../root/MeterRoot';
import { useMeterRootContext } from '../root/MeterRootContext';

/**
 * Visualizes the position of the value along the range.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export function MeterIndicator(componentProps: MeterIndicator.Props) {
  const context = useMeterRootContext();

  const getElementProps = (prev: HTMLProps): HTMLProps => {
    const { render, className, style, ...elementProps } = componentProps;
    return { ...prev, ...elementProps };
  };

  const getIndicatorProps = (prev: HTMLProps): HTMLProps => ({
    ...prev,
    style: {
      insetInlineStart: 0,
      height: 'inherit',
      width: `${context.value.percentageValue}%`,
    },
  });

  const getElement = useRenderElement('div', componentProps, {
    ref: componentProps.ref,
    props: [getIndicatorProps, getElementProps],
  });

  return <>{getElement()}</>;
}

export interface MeterIndicatorState extends MeterRootState {}

export interface MeterIndicatorProps extends BaseUIComponentProps<'div', MeterIndicatorState> {}

export namespace MeterIndicator {
  export type State = MeterIndicatorState;
  export type Props = MeterIndicatorProps;
}
