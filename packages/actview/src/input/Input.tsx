import { defineComponent } from 'actview';
import { FieldControl } from '../field/control/FieldControl';
import type { FieldControlState } from '../field/control/FieldControl';
import type { BaseUIComponentProps } from '../internals/types';

/**
 * A native input element that automatically works with [Field](https://base-ui.com/react/components/field).
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI Input](https://base-ui.com/react/components/input)
 */
export const Input = defineComponent(function (componentProps: Input.Props) {
  // ================= render（每次更新执行） =================
  return () => {
    // 纯委托 FieldControl（字段注册/值受控逻辑都在 Field 家族）。
    // 直接 JSX 透传：className/style 的函数 union 类型（BaseUIComponentProps）合法，
    // 不存在 createElement workaround 的问题（PD-17 结论作废）
    return <FieldControl {...componentProps} />;
  };
}) as (props: Input.Props) => any;

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
