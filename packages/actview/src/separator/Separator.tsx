import { computed } from 'actview';
import type { BaseUIComponentProps, Orientation } from '../internals/types';
import { useRenderElement } from '../internals/useRenderElement';

/**
 * A separator element accessible to screen readers.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Separator](https://base-ui.com/react/components/separator)
 */
export function Separator(componentProps: Separator.Props) {
  const getElementProps = () => {
    const {
      render: _render,
      className: _className,
      style: _style,
      orientation: _orientation,
      ...elementProps
    } = componentProps;
    return elementProps;
  };

  const state = computed(() => ({
    orientation: componentProps.orientation ?? 'horizontal',
  }) as SeparatorState);

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: componentProps.ref,
    props: [
      {
        role: 'separator',
        'aria-orientation': componentProps.orientation ?? 'horizontal',
      },
      getElementProps,
    ],
  });

  return getElement();
}

export interface SeparatorProps extends BaseUIComponentProps<'div', SeparatorState> {
  /**
   * The orientation of the separator.
   * @default 'horizontal'
   */
  orientation?: Orientation | undefined;
}

export interface SeparatorState {
  /**
   * The orientation of the separator.
   */
  orientation: Orientation;
}

export namespace Separator {
  export type Props = SeparatorProps;
  export type State = SeparatorState;
}
