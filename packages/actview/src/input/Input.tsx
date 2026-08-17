import { createElement } from '@actview/jsx';
import { FieldControl } from '../field/control/FieldControl';
import type { FieldControlState } from '../field/control/FieldControl';
import type { BaseUIComponentProps } from '../internals/types';

/**
 * A native input element that automatically works with [Field](https://base-ui.com/react/components/field).
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI Input](https://base-ui.com/react/components/input)
 */
export function Input(props: Input.Props) {
  // `createElement` is used instead of `<FieldControl {...props} />` because the JSX
  // element check rejects Base UI's function-valued `className`/`style` props
  // (plantform-diff.md PD-17).
  return <>{createElement(FieldControl, props)}</>;
}

export interface InputProps extends BaseUIComponentProps<'input', InputState> {
  /**
   * Callback fired when the `value` changes. Use when controlled.
   */
  onValueChange?: ((value: string, eventDetails: Input.ChangeEventDetails) => void) | undefined;
  /**
   * The default value of the input. Use when uncontrolled.
   */
  defaultValue?: FieldControl.Props['defaultValue'] | undefined;
  /**
   * The value of the input. Use when controlled.
   */
  value?: string | number | readonly string[] | undefined;
}

export interface InputState extends FieldControlState {}

export type InputChangeEventReason = FieldControl.ChangeEventReason;
export type InputChangeEventDetails = FieldControl.ChangeEventDetails;

export namespace Input {
  export type Props = InputProps;
  export type State = InputState;
  export type ChangeEventReason = InputChangeEventReason;
  export type ChangeEventDetails = InputChangeEventDetails;
}
