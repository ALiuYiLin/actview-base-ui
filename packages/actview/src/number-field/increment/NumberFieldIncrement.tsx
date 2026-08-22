import type { BaseUIComponentProps, NativeButtonProps } from '@/internals/types';
import { useNumberFieldStepperButton } from '@/number-field/root/useNumberFieldStepperButton';
import type { NumberFieldRootState } from '@/number-field/root/NumberFieldRoot';

/**
 * A stepper button that increases the field value when clicked.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Number Field](https://base-ui.com/react/components/number-field)
 */
export function NumberFieldIncrement(componentProps: NumberFieldIncrement.Props) {
  const getElement = useNumberFieldStepperButton(componentProps, true);
  return <>{getElement()}</>;
}

export interface NumberFieldIncrementState extends NumberFieldRootState {}

export interface NumberFieldIncrementProps
  extends NativeButtonProps, BaseUIComponentProps<'button', NumberFieldIncrementState> {}

export namespace NumberFieldIncrement {
  export type State = NumberFieldIncrementState;
  export type Props = NumberFieldIncrementProps;
}
