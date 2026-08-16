import { useMeterRootContext } from '../root/MeterRootContext';
import type { MeterRootState } from '../root/MeterRoot';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useRegisteredLabelId } from '../../utils/useRegisteredLabelId';

/**
 * An accessible label for the meter.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export function MeterLabel(componentProps: MeterLabel.Props) {
  const context = useMeterRootContext();

  const id = useRegisteredLabelId(componentProps.id, context.value.setLabelId);

  const getLabelProps = (prev: HTMLProps): HTMLProps => ({
    ...prev,
    id,
    role: 'presentation',
  });

  const getElementProps = (prev: HTMLProps): HTMLProps => {
    const { render, className, style, id: idProp, ...elementProps } = componentProps;
    return { ...prev, ...elementProps };
  };

  const getElement = useRenderElement('span', componentProps, {
    ref: componentProps.ref,
    props: [getLabelProps, getElementProps],
  });

  return <>{getElement()}</>;
}

export interface MeterLabelState extends MeterRootState {}

export interface MeterLabelProps extends BaseUIComponentProps<'span', MeterLabelState> {}

export namespace MeterLabel {
  export type State = MeterLabelState;
  export type Props = MeterLabelProps;
}
