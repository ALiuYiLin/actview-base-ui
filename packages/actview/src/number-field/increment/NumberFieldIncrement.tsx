import type { NativeButtonProps, BaseUIComponentProps } from '@/internals/types';
import type { NumberFieldRootState } from '../root/NumberFieldRoot';
import { useNumberFieldStepperButton } from '../root/useNumberFieldStepperButton';

/**
 * Increments the field value.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Number Field](https://base-ui.com/react/components/number-field)
 */
export function NumberFieldIncrement(componentProps: NumberFieldIncrement.Props) {
  // 委托共享 hook（返回渲染函数）——最后 return JSX 包裹调用
  const renderFn = useNumberFieldStepperButton(componentProps, true) as any;
  return <>{renderFn()}</>;
}

export interface NumberFieldIncrementState extends NumberFieldRootState {}

export interface NumberFieldIncrementProps
  extends NativeButtonProps, BaseUIComponentProps<'button', NumberFieldIncrementState> {}

export namespace NumberFieldIncrement {
  export type State = NumberFieldIncrementState;
  export type Props = NumberFieldIncrementProps;
}
