import { computed, defineComponent } from 'actview';
import { useMeterRootContext } from '../root/MeterRootContext';
import type { MeterRootState } from '../root/MeterRoot';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRegisteredLabelId } from '../../utils/useRegisteredLabelId';
import { mergePropsN } from '../../merge-props';

/**
 * An accessible label for the meter.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export const MeterLabel = defineComponent(function (componentProps: MeterLabel.Props) {
  // ================= setup（只执行一次） =================
  // context hook 必须在 setup 顶层（AD-42）；setLabelId 是 Root 提供的稳定函数
  const context = useMeterRootContext();

  // 注册 label id 到 Root：idProp 传 computed（响应式）——id 变化重新注册（PD-15）
  const id = useRegisteredLabelId(
    computed(() => componentProps.id),
    context.value.setLabelId,
  );

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      id: _id, // setup useRegisteredLabelId 已接管
      ref: _ref, // 用户 ref：根是元素，可顺带绑定
      ...elementProps
    } = componentProps;

    const state: MeterLabelState = {};

    const merged = mergePropsN([
      { id: id.value, role: 'presentation' },
      elementProps,
      {
        className: typeof className === 'function' ? className(state) : className,
        style: typeof style === 'function' ? style(state) : style,
      },
    ]);

    if (typeof render === 'function') {
      return render({ ...merged, ...state });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} />;
    }
    return <span {...merged} />;
  };
}) as (props: MeterLabel.Props) => any;

export interface MeterLabelState extends MeterRootState {}

export interface MeterLabelProps extends BaseUIComponentProps<'span', MeterLabelState> {}

export namespace MeterLabel {
  export type State = MeterLabelState;
  export type Props = MeterLabelProps;
}
