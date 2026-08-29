import {computed, ref, toRefs} from 'actview';
import type { Ref } from 'actview';
import type { FieldRootState } from '../root/FieldRoot';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { fieldValidityMapping } from '@/internals/field-constants/constants';
import type { BaseUIComponentProps } from '@/internals/types';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { useLabel } from '@/internals/labelable-provider/useLabel';
import { useFieldItemContext } from '../item/FieldItemContext';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

/**
 * An accessible label that is automatically associated with the field control.
 * Renders a `<label>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldLabel(componentProps: FieldLabel.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 ref：经 params.ref 合并链透传（不用 useRootElementFragment）。
  const rootRef = ref(null as HTMLElement | null);

  // context 载体直取（store-as-is）：字段渲染期 `.value` 求值即追踪。
  const fieldRootContext = useFieldRootContext(false);
  const fieldItemContext = useFieldItemContext();
  const {labelId} = useLabelableContext();

  // useLabel 的 native 形态在 setup 决定 handler 结构（初始化型快照）。
  const nativeLabel = componentProps.nativeLabel ?? true;

  const state = computed<FieldLabelState>(() => ({
    ...fieldRootContext.state.value,
    disabled: fieldRootContext.disabled.value || fieldItemContext.disabled.value,
  }));

  // id 用 computed：labelId（labelable 作用域）或组件 id 变化时实时更新
  // （setup 快照会停留在首渲染值——React 版每次 render 重算）。
  const labelProps = useLabel({
    id: computed(() => labelId.value ?? componentProps.id),
    native: nativeLabel,
  });

  // 值形 props toRefs 活引用；children 不解构、随 elementRefs 流入渲染元素。
  // nativeLabel 为组件自定义 props（决定 label 语义）——剔除，否则泄漏。
  const { className, render, style, nativeLabel: _nativeLabel, ...elementRefs } = toRefs(
    componentProps,
  ) as Record<string, Ref<any>>;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {useRenderElement(
        'label',
        {
          className: className?.value,
          render: render?.value,
          style: style?.value,
        },
        {
          state: state.value,
          stateAttributesMapping: fieldValidityMapping,
          ref: useMergedRefs(rootRef, componentProps.ref as any),
          props: [labelProps, elementProps.value],
        },
      )}
    </>
  );
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
