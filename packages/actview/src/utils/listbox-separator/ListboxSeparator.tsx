import type { BaseUIComponentProps, Orientation } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * A visual separator between items.
 * Renders a `<div>` element.
 *
 * @internal
 */
export function ListboxSeparator(componentProps: ListboxSeparator.Props) {
  const { className, render, orientation = 'horizontal', style, ...elementProps } = componentProps;

  const state: ListboxSeparatorState = { orientation };

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: componentProps.ref,
    props: [{ role: 'presentation' }, elementProps],
  });

  return getElement();
}

export interface ListboxSeparatorProps extends BaseUIComponentProps<'div', ListboxSeparatorState> {
  /**
   * The orientation of the separator.
   * @default 'horizontal'
   */
  orientation?: Orientation | undefined;
}

export interface ListboxSeparatorState {
  /**
   * The orientation of the separator.
   */
  orientation: Orientation;
}

export namespace ListboxSeparator {
  export type Props = ListboxSeparatorProps;
  export type State = ListboxSeparatorState;
}
