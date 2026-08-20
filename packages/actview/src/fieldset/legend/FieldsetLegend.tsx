import { computed, defineComponent, useRootElement } from 'actview';
import { useFieldsetRootContext } from '../root/FieldsetRootContext';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { getStateAttributesProps } from '../../internals/getStateAttributesProps';
import { useRegisteredLabelId } from '../../utils/useRegisteredLabelId';
import { mergePropsN } from '../../merge-props';

/**
 * An accessible label that is automatically associated with the fieldset.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Fieldset](https://base-ui.com/react/components/fieldset)
 */
export const FieldsetLegend = defineComponent(function (componentProps: FieldsetLegend.Props) {
  // ================= setup（只执行一次） =================
  // context hook 必须在 setup 顶层（AD-42）；setLegendId 是 Root 提供的稳定函数
  const rootContext = useFieldsetRootContext();

  // 组件根 DOM：根是元素（div），useRootElement 自动绑定（案例 6）
  const rootRef = useRootElement();

  // 注册 label id 到 Root：idProp 传 computed（响应式）——id 变化重新注册（PD-15）。
  // ⚠️ 不能传原始 prop（setup 只跑一次，解构/直传都是首次值快照）
  const id = useRegisteredLabelId(
    computed(() => componentProps.id),
    rootContext.value.setLegendId,
  );

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      id: _id, // setup useRegisteredLabelId 已接管
      ref: _ref, // 用户 ref：根是元素，useRootElement 自动绑定
      ...elementProps
    } = componentProps;

    const state: FieldsetLegendState = {
      disabled: rootContext.value.disabled,
    };

    // state → data-* 属性（默认映射：disabled=true → data-disabled=""）
    const stateAttributes = getStateAttributesProps(state);

    const merged = mergePropsN([
      { id: id.value },
      stateAttributes,
      elementProps,
      {
        className: typeof className === 'function' ? className(state) : className,
        style: typeof style === 'function' ? style(state) : style,
      },
    ]);

    if (typeof render === 'function') {
      return render({ ...merged, ...state, ref: rootRef });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />;
    }
    return <div ref={rootRef} {...merged} />;
  };
}) as (props: FieldsetLegend.Props) => any;

export interface FieldsetLegendState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface FieldsetLegendProps extends BaseUIComponentProps<'div', FieldsetLegendState> {}

export namespace FieldsetLegend {
  export type State = FieldsetLegendState;
  export type Props = FieldsetLegendProps;
}
