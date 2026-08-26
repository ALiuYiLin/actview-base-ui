import { useRootElementFragment } from '@/internals/useRootElementFragment';
import { toValue, toRefs, unrefs, computed } from 'actview';
import type { FieldRootState } from '../root/FieldRoot';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { fieldValidityMapping } from '@/internals/field-constants/constants';
import type { BaseUIComponentProps } from '@/internals/types';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { useLabel } from '@/internals/labelable-provider/useLabel';
import { useFieldItemContext } from '../item/FieldItemContext';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * An accessible label that is automatically associated with the field control.
 * Renders a `<label>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldLabel(componentProps: FieldLabel.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElementFragment();

  const fieldRootContext = toValue(useFieldRootContext(false));
  const fieldItemContext = toValue(useFieldItemContext());
  const {labelId} = toValue(useLabelableContext());

  const nativeLabel = toValue(componentProps.nativeLabel) ?? true;

  const state = () => ({
    ...fieldRootContext.state.value,
    disabled: fieldRootContext.disabled.value || fieldItemContext.disabled.value,
  });

  // id 用 computed：labelId（labelable 作用域）或组件 id 变化时实时更新
  // （setup 快照会停留在首渲染值——React 版每次 render 重算）。
  const labelProps = useLabel({
    id: computed(() => labelId.value ?? toValue(componentProps.id)),
    native: nativeLabel,
  });

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => [labelProps, {...unrefs(elementProps)}],
    state,
    stateAttributesMapping: fieldValidityMapping,
    className,
    style,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'label',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface FieldLabelState extends FieldRootState {}

export interface FieldLabelProps extends BaseUIComponentProps<'label', FieldLabelState> {
  /**
   * Whether the component renders a native `<label>` element when replacing it via the `render` prop.
   * Set to `false` if the rendered element is not a label (for example, `<div>`).
   *
   * This is useful to avoid inheriting label behaviors on `<button>` controls (such as `<Select.Trigger>` and `<Combobox.Trigger>`), including avoiding `:hover` on the button when hovering the label, and preventing clicks on the label from firing on the button.
   * @default true
   */
  nativeLabel?: boolean | undefined;
}

export namespace FieldLabel {
  export type State = FieldLabelState;
  export type Props = FieldLabelProps;
}
