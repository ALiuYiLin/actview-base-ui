import { computed } from 'actview';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useSelectRootContext } from '../root/SelectRootContext';
import { triggerOpenStateMapping } from '../../utils/popupStateMapping';
import { selectors } from '../store';

/**
 * An icon that indicates that the trigger button opens a select popup.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectIcon(componentProps: SelectIcon.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    ...elementProps
  } = componentProps;

  const rootContext = useSelectRootContext().value!;
  const { store } = rootContext;
  const open = store.useState('open');

  const state = computed<SelectIconState>(() => ({
    open: open.value,
  }));

  const getElement = useRenderElement('span', componentProps, {
    state,
    ref: componentProps.ref,
    props: [
      (prev: any) => ({ ...prev, 'aria-hidden': true, children: '▼' }),
      elementProps,
    ],
    stateAttributesMapping: triggerOpenStateMapping,
  });

  return <>{getElement()}</>;
}

export interface SelectIconState {
  /**
   * Whether the select popup is currently open.
   */
  open: boolean;
}

export interface SelectIconProps extends BaseUIComponentProps<'span', SelectIconState> {}

export namespace SelectIcon {
  export type State = SelectIconState;
  export type Props = SelectIconProps;
}
