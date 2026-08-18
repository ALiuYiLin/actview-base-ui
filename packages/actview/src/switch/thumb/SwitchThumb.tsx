import type { SwitchRootState } from '../root/SwitchRoot';
import { useSwitchRootContext } from '../root/SwitchRootContext';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps } from '../../internals/types';
import { stateAttributesMapping } from '../stateAttributesMapping';

/**
 * The movable part of the switch that indicates whether the switch is on or off.
 * Renders a `<span>`.
 *
 * Documentation: [Base UI Switch](https://base-ui.com/react/components/switch)
 */
export function SwitchThumb(componentProps: SwitchThumb.Props) {
  const getElementProps = () => {
    const {
      render: _render,
      className: _className,
      style: _style,
      ...elementProps
    } = componentProps;
    return elementProps;
  };

  const state = useSwitchRootContext();

  const getElement = useRenderElement('span', componentProps, {
    state,
    ref: componentProps.ref,
    stateAttributesMapping,
    props: [getElementProps],
  });

  // Wrap in a Fragment so the ActView Babel transform recognizes this as a JSX
  // return and converts the component to a `{ __setup }` VNode type (AI-003).
  return <>{getElement()}</>;
}

export interface SwitchThumbProps extends BaseUIComponentProps<'span', SwitchThumbState> {}

export interface SwitchThumbState extends SwitchRootState {}

export namespace SwitchThumb {
  export type Props = SwitchThumbProps;
  export type State = SwitchThumbState;
}
