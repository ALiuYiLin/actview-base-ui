import { defineComponent, useRootElement, watch } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useMenuGroupRootContext } from '../group/MenuGroupContext';
import { mergePropsN } from '../../merge-props';

/**
 * An accessible label that is automatically associated with its parent group.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export const MenuGroupLabel = defineComponent(function (componentProps: MenuGroupLabel.Props) {
  // ================= setup（只执行一次） =================
  const rootRef = useRootElement();

  const id = useBaseUiId(componentProps.id);

  const setLabelId = useMenuGroupRootContext().value;

  watch(
    () => id,
    () => {
      setLabelId(id);
      return () => {
        setLabelId((currentId: string | undefined) => (currentId === id ? undefined : currentId));
      };
    },
    { immediate: true },
  );

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      id: _id,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const merged = mergePropsN([
      elementProps,
      {
        role: 'presentation',
        className: typeof className === 'function' ? className({} as any) : className,
        style: typeof style === 'function' ? style({} as any) : style,
      },
    ]);

    // render 三形态
    if (typeof render === 'function') {
      return render({ ...merged, id, ref: rootRef });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} id={id} ref={rootRef} />;
    }
    return <div ref={rootRef} {...merged} id={id} />;
  };
}) as (props: MenuGroupLabel.Props) => any;

export interface MenuGroupLabelProps extends BaseUIComponentProps<'div', MenuGroupLabelState> {}

export interface MenuGroupLabelState {}

export namespace MenuGroupLabel {
  export type Props = MenuGroupLabelProps;
  export type State = MenuGroupLabelState;
}