import { computed } from 'actview';
import { useRenderElement } from '../../internals/useRenderElement';
import type { HTMLProps } from '../../internals/types';
import type { ProgressRootState } from '../root/ProgressRoot';
import { useProgressRootContext } from '../root/ProgressRootContext';
import { progressStateAttributesMapping } from '../root/stateAttributesMapping';
import type { BaseUIComponentProps } from '../../internals/types';

/**
 * Visualizes the completion status of the task.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export function ProgressIndicator(componentProps: ProgressIndicator.Props) {
  const context = useProgressRootContext();

  const getElementProps = (prev: HTMLProps): HTMLProps => {
    const { render, className, style, ...elementProps } = componentProps;
    return { ...prev, ...elementProps };
  };

  const getIndicatorProps = (prev: HTMLProps): HTMLProps => {
    const percentageValue = context.value.percentageValue;
    const indicatorStyle: Record<string, string | number> =
      percentageValue == null
        ? {}
        : {
            insetInlineStart: 0,
            height: 'inherit',
            width: `${percentageValue}%`,
          };

    return { ...prev, style: indicatorStyle };
  };

  const state = computed(() => context.value.state);

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: componentProps.ref,
    props: [getIndicatorProps, getElementProps],
    stateAttributesMapping: progressStateAttributesMapping,
  });

  return <>{getElement()}</>;
}

export interface ProgressIndicatorState extends ProgressRootState {}

export interface ProgressIndicatorProps
  extends BaseUIComponentProps<'div', ProgressIndicatorState> {}

export namespace ProgressIndicator {
  export type State = ProgressIndicatorState;
  export type Props = ProgressIndicatorProps;
}
