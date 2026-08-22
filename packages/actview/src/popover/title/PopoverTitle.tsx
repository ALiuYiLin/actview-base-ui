import { usePopoverRootContext } from '@/popover/root/PopoverRootContext';
import type { BaseUIComponentProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';
import { useBaseUiId } from '@/internals/useBaseUiId';

/**
 * A heading that labels the popover.
 * Renders an `<h2>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverTitle(componentProps: PopoverTitle.Props) {
  const { render: _render, className: _className, style: _style, ...elementProps } = componentProps;

  const store = usePopoverRootContext().value!;

  const id = useBaseUiId(elementProps.id);

  store.useSyncedValueWithCleanup('titleElementId', id);

  const element = useRenderElement('h2', componentProps, {
    ref: componentProps.ref,
    props: [{ id }, elementProps],
  });

  return <>{element()}</>;
}

export interface PopoverTitleState {}

export interface PopoverTitleProps extends BaseUIComponentProps<
  'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
  PopoverTitleState
> {}

export namespace PopoverTitle {
  export type State = PopoverTitleState;
  export type Props = PopoverTitleProps;
}
