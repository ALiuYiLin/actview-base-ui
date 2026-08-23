import { defineComponent } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { Field, type FieldControlState } from '@/field';

/**
 * A native input element that automatically works with [Field](https://base-ui.com/react/components/field).
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI Input](https://base-ui.com/react/components/input)
 */
export const Input: any = defineComponent(function (props: Input.Props) {
  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    return <Field.Control {...(props as any)} />;
  };
}) as unknown as (props: Input.Props) => JSX.Element;

export interface InputProps extends BaseUIComponentProps<'input', InputState> {
  /**
   * Callback fired when the `value` changes. Use when controlled.
   */
  onValueChange?: ((value: string, eventDetails: Input.ChangeEventDetails) => void) | undefined;
  /**
   * The default value of the input. Use when uncontrolled.
   */
  defaultValue?: Field.Control.Props['defaultValue'] | undefined;
  /**
   * The value of the input. Use when controlled.
   */
  value?: string | number | readonly string[] | undefined;
}

export interface InputState extends FieldControlState {}

export type InputChangeEventReason = Field.Control.ChangeEventReason;
export type InputChangeEventDetails = Field.Control.ChangeEventDetails;

export namespace Input {
  export type Props = InputProps;
  export type State = InputState;
  export type ChangeEventReason = InputChangeEventReason;
  export type ChangeEventDetails = InputChangeEventDetails;
}
