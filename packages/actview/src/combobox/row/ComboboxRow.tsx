import { defineComponent, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { ComboboxRowContext } from '@/combobox/row/ComboboxRowContext';
import { mergePropsN } from '@/merge-props';

/**
 * Displays a single row of items in a grid list.
 * Enable `grid` on the root component to turn the listbox into a grid.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export const ComboboxRow = defineComponent(function (componentProps: ComboboxRow.Props) {
  // ================= setup（只执行一次） =================
  const rootRef = useRootElement();

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const merged = mergePropsN([
      elementProps,
      {
        role: 'row',
        className: typeof className === 'function' ? className({} as any) : className,
        style: typeof style === 'function' ? style({} as any) : style,
      },
    ]);

    const element = (() => {
      if (typeof render === 'function') {
        return render({ ...merged, ref: rootRef });
      }
      if (render) {
        const Tag = render.type as any;
        return <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />;
      }
      return <div ref={rootRef} {...merged} />;
    })();

    return (
      <ComboboxRowContext.Provider value={true}>
        {element}
      </ComboboxRowContext.Provider>
    );
  };
}) as (props: ComboboxRow.Props) => any;

export interface ComboboxRowState {}

export interface ComboboxRowProps extends BaseUIComponentProps<'div', ComboboxRowState> {}

export namespace ComboboxRow {
  export type State = ComboboxRowState;
  export type Props = ComboboxRowProps;
}