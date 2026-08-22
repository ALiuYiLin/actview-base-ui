import { defineComponent, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { mergePropsN } from '@/merge-props';

/**
 * An icon that indicates that the trigger button opens the popup.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export const ComboboxIcon = defineComponent(function (componentProps: ComboboxIcon.Props) {
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
        'aria-hidden': true,
        children: '▼',
        className: typeof className === 'function' ? className({} as any) : className,
        style: typeof style === 'function' ? style({} as any) : style,
      },
    ]);

    // render 三形态
    if (typeof render === 'function') {
      return render({ ...merged, ref: rootRef });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />;
    }
    return <span ref={rootRef} {...merged} />;
  };
}) as (props: ComboboxIcon.Props) => any;

export interface ComboboxIconState {}

export interface ComboboxIconProps extends BaseUIComponentProps<'span', ComboboxIconState> {}

export namespace ComboboxIcon {
  export type State = ComboboxIconState;
  export type Props = ComboboxIconProps;
}