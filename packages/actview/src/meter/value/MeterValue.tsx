import type { VNodeChild } from '@actview/jsx';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useMeterRootContext } from '../root/MeterRootContext';
import type { MeterRootState } from '../root/MeterRoot';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * A text element displaying the current value.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export function MeterValue(componentProps: MeterValue.Props) {
  const context = useMeterRootContext();

  const getValueProps = (prev: HTMLProps): HTMLProps => {
    const { value, formattedValue } = context.value;
    return {
      ...prev,
      'aria-hidden': true,
      children:
        typeof componentProps.children === 'function'
          ? componentProps.children(formattedValue, value)
          : formattedValue,
    };
  };

  const getElementProps = (prev: HTMLProps): HTMLProps => {
    const { className, render, children, style, ...elementProps } = componentProps;
    return { ...prev, ...elementProps };
  };

  const getElement = useRenderElement('span', componentProps, {
    ref: componentProps.ref,
    props: [getValueProps, getElementProps],
  });

  return <>{getElement()}</>;
}

export interface MeterValueState extends MeterRootState {}

export interface MeterValueProps
  extends Omit<BaseUIComponentProps<'span', MeterValueState>, 'children'> {
  children?: null | ((formattedValue: string, value: number) => VNodeChild) | undefined;
}

export namespace MeterValue {
  export type State = MeterValueState;
  export type Props = MeterValueProps;
}
