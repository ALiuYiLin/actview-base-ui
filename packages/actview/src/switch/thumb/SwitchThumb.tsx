import { defineComponent, useRootElement } from 'actview';
import type { SwitchRootState } from '../root/SwitchRoot';
import { useSwitchRootContext } from '../root/SwitchRootContext';
import type { BaseUIComponentProps } from '../../internals/types';
import { getStateAttributesProps } from '../../internals/getStateAttributesProps';
import { stateAttributesMapping } from '../stateAttributesMapping';
import { mergePropsN } from '../../merge-props';

/**
 * The movable part of the switch that indicates whether the switch is on or off.
 * Renders a `<span>`.
 *
 * Documentation: [Base UI Switch](https://base-ui.com/react/components/switch)
 */
export const SwitchThumb = defineComponent(function (componentProps: SwitchThumb.Props) {
  // ================= setup（只执行一次） =================
  const rootRef = useRootElement();

  const context = useSwitchRootContext();

  // ================= render（每次更新执行） =================
  return () => {
    const { render, className, style, ref: _ref, ...elementProps } = componentProps;

    const stateValue = context.value;

    const stateAttributes = getStateAttributesProps(stateValue, stateAttributesMapping);

    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      {
        className: typeof className === 'function' ? className(stateValue) : className,
        style: typeof style === 'function' ? style(stateValue) : style,
      },
    ]);

    // render 三形态
    if (typeof render === 'function') {
      return render({ ...merged, ...stateValue, ref: rootRef });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />;
    }
    return <span ref={rootRef} {...merged} />;
  };
}) as (props: SwitchThumb.Props) => any;

export interface SwitchThumbProps extends BaseUIComponentProps<'span', SwitchThumbState> {}

export interface SwitchThumbState extends SwitchRootState {}

export namespace SwitchThumb {
  export type Props = SwitchThumbProps;
  export type State = SwitchThumbState;
}