import type { BaseUIComponentProps } from '../../internals/types';
import { useSelectRootContext } from '../root/SelectRootContext';
import { useSelectItemContext } from '../item/SelectItemContext';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * A text label of the select item.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectItemText(componentProps: SelectItemText.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    ...elementProps
  } = componentProps;

  const itemContext = useSelectItemContext().value;
  const rootContext = useSelectRootContext().value!;
  const { firstItemTextRef, selectedItemTextRef } = rootContext;

  const { index, textRef, selectedByFocus } = itemContext;

  const localRef = (node: HTMLElement | null) => {
    if (!node) {
      return;
    }

    if (index === 0) {
      firstItemTextRef.current = node;
    }
    if (selectedByFocus) {
      selectedItemTextRef.current = node;
    }
  };

  const getElement = useRenderElement('div', componentProps, {
    ref: [localRef, componentProps.ref, textRef],
    props: elementProps,
  });

  return <>{getElement()}</>;
}

export interface SelectItemTextState {}

export interface SelectItemTextProps extends BaseUIComponentProps<'div', SelectItemTextState> {}

export namespace SelectItemText {
  export type State = SelectItemTextState;
  export type Props = SelectItemTextProps;
}
