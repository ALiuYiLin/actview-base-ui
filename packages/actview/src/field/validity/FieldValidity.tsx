import {computed} from 'actview';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { getCombinedFieldValidityData } from '../utils/getCombinedFieldValidityData';
import type { FieldValidityData } from '../root/FieldRoot';
import { type TransitionStatus, useTransitionStatus } from '@/internals/useTransitionStatus';

/**
 * Used to display a custom message based on the field's validity.
 * Requires `children` to be a function that accepts field validity state as an argument.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldValidity(props: FieldValidity.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // context 载体直取（store-as-is）：字段渲染期 `.value` 求值即追踪。
  const {validityData, invalid} = useFieldRootContext(false);

  const combinedFieldValidityData = computed(() =>
    getCombinedFieldValidityData(validityData.value, invalid.value),
  );
  const isInvalid = computed(() => combinedFieldValidityData.value.state.valid === false);
  const {transitionStatus} = useTransitionStatus(isInvalid);

  // `fieldValidityState` is handed straight to a public render prop, so its identity is observable:
  // consumers can pass it to a memoized child. Keep it stable across unrelated field-state changes
  // (focus, dirty, filled) so those children don't rerender when the validity itself is unchanged.
  const fieldValidityState = computed<FieldValidityState>(() => ({
    ...combinedFieldValidityData.value,
    validity: combinedFieldValidityData.value.state,
    transitionStatus: transitionStatus.value,
  }));

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // children 为 render prop（渲染期求值，无 IIFE）。
  return <>{props.children(fieldValidityState.value)}</>;
}

export interface FieldValidityState extends Omit<FieldValidityData, 'state'> {
  /**
   * The validity state.
   */
  validity: FieldValidityData['state'];
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface FieldValidityProps {
  /**
   * A function that accepts the field validity state as an argument.
   *
   * ```jsx
   * <Field.Validity>
   *   {(validity) => {
   *     return <div>...</div>
   *   }}
   * </Field.Validity>
   * ```
   */
  children: (state: FieldValidityState) => any;
}

export namespace FieldValidity {
  export type State = FieldValidityState;
  export type Props = FieldValidityProps;
}
