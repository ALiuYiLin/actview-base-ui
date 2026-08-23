import { defineComponent } from 'actview';
import type { NativeButtonProps, BaseUIComponentProps } from '@/internals/types';
import type { NumberFieldRootState } from '../root/NumberFieldRoot';
import { useNumberFieldStepperButton } from '../root/useNumberFieldStepperButton';

/**
 * Increments the field value.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Number Field](https://base-ui.com/react/components/number-field)
 */
export const NumberFieldIncrement = defineComponent(function (
  componentProps: NumberFieldIncrement.Props,
) {
  return useNumberFieldStepperButton(componentProps, true) as any;
}) as unknown as (props: NumberFieldIncrement.Props) => JSX.Element;

export interface NumberFieldIncrementState extends NumberFieldRootState {}

export interface NumberFieldIncrementProps
  extends NativeButtonProps, BaseUIComponentProps<'button', NumberFieldIncrementState> {}

export namespace NumberFieldIncrement {
  export type State = NumberFieldIncrementState;
  export type Props = NumberFieldIncrementProps;
}
