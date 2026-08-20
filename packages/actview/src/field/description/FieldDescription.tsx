import { computed, defineComponent, onMounted, onUnmounted, useRootElement } from 'actview';
import { type FieldRootState } from '../root/FieldRoot';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import { fieldValidityMapping } from '../../internals/field-constants/constants';
import type { BaseUIComponentProps } from '../../internals/types';
import { getStateAttributesProps } from '../../internals/getStateAttributesProps';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useFieldItemContext } from '../item/FieldItemContext';
import { mergePropsN } from '../../merge-props';

/**
 * A paragraph with additional information about the field.
 * Renders a `<p>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export const FieldDescription = defineComponent(function (componentProps: FieldDescription.Props) {
  // ================= setup（只执行一次） =================
  // useBaseUiId(idOverride)：用户 id 优先，否则生成（React useId 语义）
  const id = useBaseUiId(componentProps.id);

  // context hook 必须在 setup 顶层（AD-42）
  const fieldRootContext = useFieldRootContext(false);
  const fieldItemContext = useFieldItemContext();
  const labelableContext = useLabelableContext();

  // 组件根 DOM：根是元素（p），useRootElement 自动绑定（案例 6）
  const rootRef = useRootElement();

  const state = computed(
    () =>
      ({
        ...fieldRootContext.value.state,
        disabled:
          (fieldRootContext.value.disabled ?? false) || fieldItemContext.value.disabled,
      }) as FieldDescriptionState,
  );

  // messageId 注册（aria-describedby 关联）：id 是 setup 固定值，
  // 挂载注册、卸载注销（替代 useIsoLayoutEffect——actview-utils 版只在挂载跑一次，
  // 语义等价）
  onMounted(() => {
    if (!id) {
      return;
    }
    const current = labelableContext.value.messageIds;
    labelableContext.value.setMessageIds([...current, id]);
  });
  onUnmounted(() => {
    const current = labelableContext.value.messageIds;
    labelableContext.value.setMessageIds(current.filter((item) => item !== id));
  });

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      id: _idProp, // setup useBaseUiId 已接管
      ref: _ref, // 用户 ref：根是元素，useRootElement 自动绑定
      ...elementProps
    } = componentProps;

    const stateValue = state.value;

    // state → data-* 属性（fieldValidityMapping）
    const stateAttributes = getStateAttributesProps(stateValue, fieldValidityMapping);

    const merged = mergePropsN([
      { id },
      stateAttributes,
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
    return <p ref={rootRef} {...merged} />;
  };
}) as (props: FieldDescription.Props) => any;

export interface FieldDescriptionState extends FieldRootState {}

export interface FieldDescriptionProps extends BaseUIComponentProps<'p', FieldDescriptionState> {}

export namespace FieldDescription {
  export type State = FieldDescriptionState;
  export type Props = FieldDescriptionProps;
}
