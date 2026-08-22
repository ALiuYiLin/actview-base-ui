import { defineComponent, useRootElement, watch } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useSelectGroupContext } from '@/select/group/SelectGroupContext';
import { mergePropsN } from '@/merge-props';

/**
 * An accessible label that is automatically associated with its parent group.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export const SelectGroupLabel = defineComponent(function (componentProps: SelectGroupLabel.Props) {
  // ================= setup（只执行一次） =================
  const rootRef = useRootElement();

  const groupContext = useSelectGroupContext().value;
  const { setLabelId } = groupContext;

  const id = useBaseUiId(componentProps.id);

  watch(
    () => id,
    () => {
      setLabelId(id);
      return () => {
        setLabelId((currentGroupLabelId: string | undefined) =>
          currentGroupLabelId === id ? undefined : currentGroupLabelId,
        );
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
}) as (props: SelectGroupLabel.Props) => any;

export interface SelectGroupLabelState {}

export interface SelectGroupLabelProps extends BaseUIComponentProps<'div', SelectGroupLabelState> {}

export namespace SelectGroupLabel {
  export type State = SelectGroupLabelState;
  export type Props = SelectGroupLabelProps;
}