import { computed } from 'actview';
import type { VNodeChild } from '@actview/jsx';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useProgressRootContext } from '../root/ProgressRootContext';
import type { ProgressRootState } from '../root/ProgressRoot';
import { progressStateAttributesMapping } from '../root/stateAttributesMapping';

/**
 * A text element displaying the current value.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export function ProgressValue(componentProps: ProgressValue.Props) {
  const context = useProgressRootContext();

  const getValueProps = (prev: HTMLProps): HTMLProps => {
    const { value, formattedValue, state } = context.value;

    // Follow `status` rather than re-deriving it: a non-finite `value` is also indeterminate, and
    // has no formatted text to show.
    const indeterminate = state.status === 'indeterminate';
    const formattedValueArg = indeterminate ? 'indeterminate' : formattedValue;
    const formattedValueDisplay = indeterminate ? null : formattedValue;

    return {
      ...prev,
      'aria-hidden': true,
      children:
        typeof componentProps.children === 'function'
          ? componentProps.children(formattedValueArg, value)
          : formattedValueDisplay,
    };
  };

  const getElementProps = (prev: HTMLProps): HTMLProps => {
    const { className, render, children, style, ...elementProps } = componentProps;
    return { ...prev, ...elementProps };
  };

  const state = computed(() => context.value.state);

  const getElement = useRenderElement('span', componentProps, {
    state,
    ref: componentProps.ref,
    props: [getValueProps, getElementProps],
    stateAttributesMapping: progressStateAttributesMapping,
  });

  return <>{getElement()}</>;
}

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
