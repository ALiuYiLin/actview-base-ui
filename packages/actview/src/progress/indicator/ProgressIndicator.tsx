import { computed, defineComponent, useRootElement } from 'actview';
import type { HTMLProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import type { ProgressRootState } from '@/progress/root/ProgressRoot';
import { useProgressRootContext } from '@/progress/root/ProgressRootContext';
import { progressStateAttributesMapping } from '@/progress/root/stateAttributesMapping';
import type { BaseUIComponentProps } from '@/internals/types';
import { mergePropsN } from '@/merge-props';

/**
 * Visualizes the completion status of the task.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export const ProgressIndicator = defineComponent(function (componentProps: ProgressIndicator.Props) {
  // ================= setup（只执行一次） =================
  const rootRef = useRootElement();
  const context = useProgressRootContext();

  const state = computed(() => context.value.state);

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const stateValue = state.value;
    const percentageValue = context.value.percentageValue;

    const stateAttributes = getStateAttributesProps(stateValue, progressStateAttributesMapping);

    const indicatorStyle: Record<string, string | number> =
      percentageValue == null
        ? {}
        : {
            insetInlineStart: 0,
            height: 'inherit',
            width: `${percentageValue}%`,
          };

    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      {
        style: indicatorStyle,
        className: typeof className === 'function' ? className(stateValue) : className,
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
    return <div ref={rootRef} {...merged} />;
  };
}) as (props: ProgressIndicator.Props) => any;

export interface ProgressIndicatorProps extends BaseUIComponentProps<'div', ProgressRootState> {}

export interface ProgressIndicatorState extends ProgressRootState {}

export namespace ProgressIndicator {
  export type State = ProgressIndicatorState;
  export type Props = ProgressIndicatorProps;
}