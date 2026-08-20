import { defineComponent } from 'actview';
import type { BaseUIComponentProps } from '../../internals/types';
import type { MeterRootState } from '../root/MeterRoot';
import { useMeterRootContext } from '../root/MeterRootContext';
import { mergePropsN } from '../../merge-props';

/**
 * Visualizes the position of the value along the range.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export const MeterIndicator = defineComponent(function (componentProps: MeterIndicator.Props) {
  // ================= setup（只执行一次） =================
  // context hook 必须在 setup 顶层（AD-42），渲染期读 .value 建立响应式
  const context = useMeterRootContext();

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      ref: _ref, // 用户 ref：根是元素，可顺带绑定
      ...elementProps
    } = componentProps;

    const state: MeterIndicatorState = {};

    // 内部定位样式 + 用户 style 合并（mergePropsN 的 style 走 mergeObjects）
    const merged = mergePropsN([
      {
        style: {
          insetInlineStart: 0,
          height: 'inherit',
          width: `${context.value.percentageValue}%`,
        },
      },
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
    return <div {...merged} />;
  };
}) as (props: MeterIndicator.Props) => any;

export interface MeterIndicatorState extends MeterRootState {}

export interface MeterIndicatorProps extends BaseUIComponentProps<'div', MeterIndicatorState> {}

export namespace MeterIndicator {
  export type State = MeterIndicatorState;
  export type Props = MeterIndicatorProps;
}
