import { watch } from 'actview';
import type { BaseUIComponentProps } from '../../internals/types';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useSelectGroupContext } from '../group/SelectGroupContext';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * An accessible label that is automatically associated with its parent group.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectGroupLabel(componentProps: SelectGroupLabel.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    id: idProp,
    ...elementProps
  } = componentProps;

  const groupContext = useSelectGroupContext().value;
  const { setLabelId } = groupContext;

  const id = useBaseUiId(idProp);

  watch(
    id,
    (currentId, _old, onCleanup) => {
      setLabelId(currentId);
      onCleanup(() => {
        setLabelId((currentGroupLabelId) =>
          currentGroupLabelId === currentId ? undefined : currentGroupLabelId,
        );
      });
    },
    { immediate: true },
  );

  const getElement = useRenderElement('div', componentProps, {
    ref: componentProps.ref,
    props: [
      (prev: any) => ({ ...prev, id }),
      elementProps,
    ],
  });

  return <>{getElement()}</>;
}

export interface SelectGroupLabelState {}

export interface SelectGroupLabelProps extends BaseUIComponentProps<'div', SelectGroupLabelState> {}

export namespace SelectGroupLabel {
  export type State = SelectGroupLabelState;
  export type Props = SelectGroupLabelProps;
}
