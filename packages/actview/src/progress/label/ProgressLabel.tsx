import { computed, defineComponent, useRootElement } from 'actview';
import type { HTMLProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { useRegisteredLabelId } from '@/utils/useRegisteredLabelId';
import { useProgressRootContext } from '@/progress/root/ProgressRootContext';
import { progressStateAttributesMapping } from '@/progress/root/stateAttributesMapping';
import type { ProgressRootState } from '@/progress/root/ProgressRoot';
import type { BaseUIComponentProps } from '@/internals/types';
import { mergePropsN } from '@/merge-props';

/**
 * An accessible label for the progress bar.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export const ProgressLabel = defineComponent(function (componentProps: ProgressLabel.Props) {
  // ================= setup（只执行一次） =================
  const rootRef = useRootElement();
  const context = useProgressRootContext();

  const id = useRegisteredLabelId(componentProps.id, context.value.setLabelId);

  const state = computed(() => context.value.state);

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      id: _id,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const stateValue = state.value;

    const stateAttributes = getStateAttributesProps(stateValue, progressStateAttributesMapping);

    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      {
        id,
        role: 'presentation',
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
}) as (props: ProgressLabel.Props) => any;

export interface ProgressLabelState extends ProgressRootState {}

export interface ProgressLabelProps extends BaseUIComponentProps<'span', ProgressLabelState> {}

export namespace ProgressLabel {
  export type State = ProgressLabelState;
  export type Props = ProgressLabelProps;
}