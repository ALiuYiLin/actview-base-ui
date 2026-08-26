import type { NativeButtonProps, BaseUIComponentProps } from '@/internals/types';
import type { NumberFieldRootState } from '../root/NumberFieldRoot';
import { useNumberFieldStepperButton } from '../root/useNumberFieldStepperButton';

/**
 * Decrements the field value.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Number Field](https://base-ui.com/react/components/number-field)
 */
export function NumberFieldDecrement(componentProps: NumberFieldDecrement.Props) {
  // 委托共享 hook（返回渲染函数）——最后 return JSX 包裹调用
  const renderFn = useNumberFieldStepperButton(componentProps, false) as any;
  return <>{renderFn()}</>;
}

export interface NumberFieldDecrementState extends NumberFieldRootState {}

export interface NumberFieldDecrementProps
  extends NativeButtonProps, BaseUIComponentProps<'button', NumberFieldDecrementState> {}

export namespace NumberFieldDecrement {
  export type State = NumberFieldDecrementState;
  export type Props = NumberFieldDecrementProps;
}
