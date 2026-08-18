import { usePopoverRootContext } from '../root/PopoverRootContext';
import type { BaseUIComponentProps } from '../../internals/types';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * A paragraph with additional information about the popover.
 * Renders a `<p>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverDescription(componentProps: PopoverDescription.Props) {
  const { render: _render, className: _className, style: _style, ...elementProps } = componentProps;

  const store = usePopoverRootContext().value!;

  const id = useBaseUiId(elementProps.id);

  store.useSyncedValueWithCleanup('descriptionElementId', id);

  const element = useRenderElement('p', componentProps, {
    ref: componentProps.ref,
    props: [{ id }, elementProps],
  });

  return <>{element()}</>;
}

export interface PopoverDescriptionState {}

export interface PopoverDescriptionProps extends BaseUIComponentProps<
  'p',
  PopoverDescriptionState
> {}

export namespace PopoverDescription {
  export type State = PopoverDescriptionState;
  export type Props = PopoverDescriptionProps;
}
