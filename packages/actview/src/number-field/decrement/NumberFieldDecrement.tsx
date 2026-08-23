import { defineComponent } from 'actview';
import type { NativeButtonProps, BaseUIComponentProps } from '@/internals/types';
import type { NumberFieldRootState } from '../root/NumberFieldRoot';
import { useNumberFieldStepperButton } from '../root/useNumberFieldStepperButton';

/**
 * Decrements the field value.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Number Field](https://base-ui.com/react/components/number-field)
 */
export const NumberFieldDecrement = defineComponent(function (
  componentProps: NumberFieldDecrement.Props,
) {
  return useNumberFieldStepperButton(componentProps, false) as any;
}) as unknown as (props: NumberFieldDecrement.Props) => JSX.Element;

export interface NumberFieldDecrementState extends NumberFieldRootState {}

export interface NumberFieldDecrementProps
  extends NativeButtonProps, BaseUIComponentProps<'button', NumberFieldDecrementState> {}

export namespace NumberFieldDecrement {
  export type State = NumberFieldDecrementState;
  export type Props = NumberFieldDecrementProps;
}
