import { computed, defineComponent, useRootElement } from 'actview';
import type { VNodeChild } from '@actview/jsx';
import type { HTMLProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { useProgressRootContext } from '@/progress/root/ProgressRootContext';
import type { ProgressRootState } from '@/progress/root/ProgressRoot';
import { progressStateAttributesMapping } from '@/progress/root/stateAttributesMapping';
import type { BaseUIComponentProps } from '@/internals/types';
import { mergePropsN } from '@/merge-props';

/**
 * A text element displaying the current value.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export const ProgressValue = defineComponent(function (componentProps: ProgressValue.Props) {
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
      children: childrenProp,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const { value, formattedValue } = context.value;

    // Follow `status` rather than re-deriving it: a non-finite `value` is also indeterminate, and
    // has no formatted text to show.
    const stateValue = state.value;
    const indeterminate = stateValue.status === 'indeterminate';
    const formattedValueArg = indeterminate ? 'indeterminate' : formattedValue;
    const formattedValueDisplay = indeterminate ? null : formattedValue;

    const stateAttributes = getStateAttributesProps(stateValue, progressStateAttributesMapping);

    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      {
        'aria-hidden': true,
        children:
          typeof childrenProp === 'function'
            ? childrenProp(formattedValueArg, value)
            : formattedValueDisplay,
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
}) as (props: ProgressValue.Props) => any;

export interface ProgressValueState extends ProgressRootState {}

export interface ProgressValueProps
  extends Omit<BaseUIComponentProps<'span', ProgressValueState>, 'children'> {
  children?:
    | null
    | ((formattedValue: string | null, value: number | null) => VNodeChild)
    | undefined;
}

export namespace ProgressValue {
  export type State = ProgressValueState;
  export type Props = ProgressValueProps;
}