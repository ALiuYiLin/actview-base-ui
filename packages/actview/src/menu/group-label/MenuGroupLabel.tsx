import { useIsoLayoutEffect } from '@base-ui/actview-utils/useIsoLayoutEffect';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useMenuGroupRootContext } from '../group/MenuGroupContext';
import { mergeProps } from '../../merge-props';

/**
 * An accessible label that is automatically associated with its parent group.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuGroupLabel(componentProps: MenuGroupLabel.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    id: idProp,
    ...elementProps
  } = componentProps;

  const id = useBaseUiId(idProp);

  const setLabelId = useMenuGroupRootContext().value;

  useIsoLayoutEffect(() => {
    setLabelId(id);
    return () => {
      setLabelId((currentId) => (currentId === id ? undefined : currentId));
    };
  });

  const getElement = useRenderElement('div', componentProps, {
    ref: componentProps.ref,
    props: [
      (prev: any) =>
        mergeProps(prev, {
          id,
          role: 'presentation',
        }) as HTMLProps,
      (prev: any) => mergeProps(prev, elementProps) as HTMLProps,
    ],
  });

  return <>{getElement()}</>;
}

export interface MenuGroupLabelProps extends BaseUIComponentProps<'div', MenuGroupLabelState> {}

export interface MenuGroupLabelState {}

export namespace MenuGroupLabel {
  export type Props = MenuGroupLabelProps;
  export type State = MenuGroupLabelState;
}
