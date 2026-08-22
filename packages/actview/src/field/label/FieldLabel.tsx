import { computed, defineComponent, onUpdated, useRootElement } from 'actview';
import { error } from '@base-ui/actview-utils/error';
import type { FieldRootState } from '@/field/root/FieldRoot';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { fieldValidityMapping } from '@/internals/field-constants/constants';
import type { BaseUIComponentProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { useLabel } from '@/internals/labelable-provider/useLabel';
import { useFieldItemContext } from '@/field/item/FieldItemContext';
import { mergePropsN } from '@/merge-props';

/**
 * An accessible label that is automatically associated with the field control.
 * Renders a `<label>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export const FieldLabel = defineComponent(function (componentProps: FieldLabel.Props) {
  // ================= setup（只执行一次） =================
  // context hook 必须在 setup 顶层（AD-42）
  const fieldRootContext = useFieldRootContext(false);
  const fieldItemContext = useFieldItemContext();
  const labelableContext = useLabelableContext();

  // 组件根 DOM：根是元素（label），useRootElement 自动绑定（案例 6）
  const rootRef = useRootElement();

  const state = computed<FieldLabelState>(() => ({
    ...fieldRootContext.value.state,
    disabled:
      (fieldRootContext.value.disabled ?? false) || fieldItemContext.value.disabled,
  }));

  // id 必须响应式（PD-15）：keyed remount 时新 label 挂载早于旧 label 卸载，
  // setup 快照会继承旧 label 的 id（labelId ?? idProp）并注册错值——computed
  // 跟随 labelId，旧 label 注销后自动回落到自己的 idProp 并重新注册
  const labelIdComputed = computed(() => labelableContext.value.labelId ?? componentProps.id);

  const getLabelProps = useLabel({
    id: labelIdComputed.value,
    native: componentProps.nativeLabel ?? true,
  });

  // dev 检查（对齐 React 版）：渲染后检查根元素标签与 nativeLabel 是否匹配。
  // onUpdated（flush 后 rootRef.value 已绑定）等价 React 渲染后/layout effect 检查；
  // 原版在渲染期读手动 { current } 对象恒为 null（案例 6），检查从未触发
  if (process.env.NODE_ENV !== 'production') {
    onUpdated(() => {
      if (!rootRef.value) {
        return;
      }
      const isLabelTag = rootRef.value.tagName === 'LABEL';
      const nativeLabel = componentProps.nativeLabel ?? true;

      if (nativeLabel && !isLabelTag) {
        error(
          '<Field.Label> expected a <label> element because the `nativeLabel` prop is true. ' +
            'Rendering a non-<label> disables native label association, so `htmlFor` will not ' +
            'work. Use a real <label> in the `render` prop, or set `nativeLabel` to `false`.',
        );
      } else if (!nativeLabel && isLabelTag) {
        error(
          '<Field.Label> expected a non-<label> element because the `nativeLabel` prop is false. ' +
            'Rendering a <label> assumes native label behavior while Base UI treats it as ' +
            'non-native, which can cause unexpected pointer behavior. Use a non-<label> in the ' +
            '`render` prop, or set `nativeLabel` to `true`.',
        );
      }
    });
  }

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      id: _idProp, // useLabel（useRegisteredLabelId）已接管 id
      nativeLabel,
      ref: _ref, // 用户 ref：根是元素，useRootElement 自动绑定
      ...elementProps
    } = componentProps;

    const stateValue = state.value;

    // state → data-* 属性（fieldValidityMapping）
    const stateAttributes = getStateAttributesProps(stateValue, fieldValidityMapping);

    // useLabel 产物：{ id, for, onMouseDown }（native）或 { id, onClick, onPointerDown }（非 native）
    const labelProps = getLabelProps();

    const merged = mergePropsN([
      stateAttributes,
      labelProps,
      elementProps,
      {
        className: typeof className === 'function' ? className(stateValue) : className,
        style: typeof style === 'function' ? style(stateValue) : style,
      },
    ]);

    // render 三形态（对照 FieldsetLegend/FieldRootInner）
    if (typeof render === 'function') {
      return render({ ...merged, ...stateValue, ref: rootRef });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />;
    }
    return <label ref={rootRef} {...merged} />;
  };
}) as (props: FieldLabel.Props) => any;

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
