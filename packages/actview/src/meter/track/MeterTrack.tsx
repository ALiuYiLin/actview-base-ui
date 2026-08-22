import { defineComponent } from 'actview';
import type { MeterRootState } from '@/meter/root/MeterRoot';
import type { BaseUIComponentProps } from '@/internals/types';
import { mergePropsN } from '@/merge-props';

/**
 * Contains the meter indicator and represents the entire range of the meter.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export const MeterTrack = defineComponent(function (componentProps: MeterTrack.Props) {
  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      ref: _ref, // 用户 ref：根是元素，可顺带绑定
      ...elementProps
    } = componentProps;

    const state: MeterTrackState = {};

    const merged = mergePropsN([
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
}) as (props: MeterTrack.Props) => any;

export interface MeterTrackState extends MeterRootState {}

export interface MeterTrackProps extends BaseUIComponentProps<'div', MeterTrackState> {}

export namespace MeterTrack {
  export type State = MeterTrackState;
  export type Props = MeterTrackProps;
}
