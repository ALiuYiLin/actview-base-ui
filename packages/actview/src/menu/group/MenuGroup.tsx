import { computed, ref } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { MenuGroupContext } from './MenuGroupContext';
import { mergeProps } from '../../merge-props';

/**
 * Groups related menu items with the corresponding label.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuGroup(componentProps: MenuGroup.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    ...elementProps
  } = componentProps;

  const labelId = ref<string | undefined>(undefined);

  const setLabelId: MenuGroupContext = (next) => {
    labelId.value =
      typeof next === 'function' ? (next as (current: string | undefined) => string | undefined)(labelId.value) : next;
  };

  const getElement = useRenderElement('div', componentProps, {
    ref: componentProps.ref,
    props: [
      (prev: any) =>
        mergeProps(prev, {
          role: 'group',
          'aria-labelledby': labelId.value,
        }) as HTMLProps,
      (prev: any) => mergeProps(prev, elementProps) as HTMLProps,
    ],
  });

  return (
    <MenuGroupContext.Provider value={computed(() => setLabelId)}>
      {getElement()}
    </MenuGroupContext.Provider>
  );
}

export interface MenuGroupProps extends BaseUIComponentProps<'div', MenuGroupState> {
  /**
   * The content of the component.
   */
  children?: any;
}

export interface MenuGroupState {}

export namespace MenuGroup {
  export type Props = MenuGroupProps;
  export type State = MenuGroupState;
}
