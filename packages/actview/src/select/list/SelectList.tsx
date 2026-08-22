import { computed } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useSelectRootContext } from '@/select/root/SelectRootContext';
import { useSelectPositionerContext } from '@/select/positioner/SelectPositionerContext';
import { useRenderElement } from '@/internals/useRenderElement';
import { styleDisableScrollbar } from '@/utils/styles';
import { LIST_FUNCTIONAL_STYLES } from '@/select/popup/utils';
import { selectors } from '@/select/store';

/**
 * A container for the select items.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectList(componentProps: SelectList.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    ...elementProps
  } = componentProps;

  const rootContext = useSelectRootContext().value!;
  const { store, scrollHandlerRef, multiple } = rootContext;
  const { alignItemWithTriggerActive } = useSelectPositionerContext().value;

  const hasScrollArrows = store.useState('hasScrollArrows');
  const openMethod = store.useState('openMethod');
  const id = store.useState('id');

  const getDefaultProps = (): HTMLProps => ({
    id: `${id.value}-list`,
    role: 'listbox',
    'aria-multiselectable': multiple || undefined,
    onScroll(event: Event) {
      scrollHandlerRef.current?.(event.currentTarget as HTMLDivElement);
    },
    ...(alignItemWithTriggerActive && {
      style: LIST_FUNCTIONAL_STYLES,
    }),
    className:
      hasScrollArrows.value && openMethod.value !== 'touch'
        ? styleDisableScrollbar.className
        : undefined,
  });

  const setListElement = store.useStateSetter('listElement');

  const getElement = useRenderElement('div', componentProps, {
    ref: [componentProps.ref, setListElement],
    props: [
      // Store-reactive attributes must be re-evaluated per render (setup would snapshot them).
      (prev: any) => ({ ...prev, ...getDefaultProps() }),
      elementProps,
    ],
  });

  return <>{getElement()}</>;
}

export interface SelectListProps extends BaseUIComponentProps<'div', SelectListState> {}

export interface SelectListState {}

export namespace SelectList {
  export type Props = SelectListProps;
  export type State = SelectListState;
}
