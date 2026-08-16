import { computed } from 'actview';
import { useRenderElement } from '../../internals/useRenderElement';
import { useRegisteredLabelId } from '../../utils/useRegisteredLabelId';
import { useProgressRootContext } from '../root/ProgressRootContext';
import { progressStateAttributesMapping } from '../root/stateAttributesMapping';
import type { ProgressRootState } from '../root/ProgressRoot';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';

/**
 * An accessible label for the progress bar.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export function ProgressLabel(componentProps: ProgressLabel.Props) {
  const context = useProgressRootContext();

  const id = useRegisteredLabelId(componentProps.id, context.value.setLabelId);

  const getLabelProps = (prev: HTMLProps): HTMLProps => ({
    ...prev,
    id,
    role: 'presentation',
  });

  const getElementProps = (prev: HTMLProps): HTMLProps => {
    const { render, className, style, id: idProp, ...elementProps } = componentProps;
    return { ...prev, ...elementProps };
  };

  const state = computed(() => context.value.state);

  const getElement = useRenderElement('span', componentProps, {
    state,
    ref: componentProps.ref,
    props: [getLabelProps, getElementProps],
    stateAttributesMapping: progressStateAttributesMapping,
  });

  return <>{getElement()}</>;
}

export interface ProgressLabelState extends ProgressRootState {}

export interface ProgressLabelProps extends BaseUIComponentProps<'span', ProgressLabelState> {}

export namespace ProgressLabel {
  export type State = ProgressLabelState;
  export type Props = ProgressLabelProps;
}
