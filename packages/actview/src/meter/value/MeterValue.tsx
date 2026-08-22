import { defineComponent } from 'actview';
import type { VNodeChild } from '@actview/jsx';
import type { BaseUIComponentProps } from '@/internals/types';
import { useMeterRootContext } from '@/meter/root/MeterRootContext';
import type { MeterRootState } from '@/meter/root/MeterRoot';
import { mergePropsN } from '@/merge-props';

/**
 * A text element displaying the current value.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export const MeterValue = defineComponent(function (componentProps: MeterValue.Props) {
  // ================= setup（只执行一次） =================
  // context hook 必须在 setup 顶层（AD-42），渲染期读 .value 建立响应式
  const context = useMeterRootContext();

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      children,
      ref: _ref, // 用户 ref：根是元素，可顺带绑定
      ...elementProps
    } = componentProps;

    const { value, formattedValue } = context.value;

    const state: MeterValueState = {};

    const merged = mergePropsN([
      {
        'aria-hidden': true,
        children:
          typeof children === 'function' ? children(formattedValue, value) : formattedValue,
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
    return <span {...merged} />;
  };
}) as (props: MeterValue.Props) => any;

export interface MeterValueState extends MeterRootState {}

export interface MeterValueProps
  extends Omit<BaseUIComponentProps<'span', MeterValueState>, 'children'> {
  children?: null | ((formattedValue: string, value: number) => VNodeChild) | undefined;
}

export namespace MeterValue {
  export type State = MeterValueState;
  export type Props = MeterValueProps;
}
