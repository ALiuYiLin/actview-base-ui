import { defineComponent, toValue, watch } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useMenuGroupRootContext } from '../group/MenuGroupContext';

/**
 * An accessible label that is automatically associated with its parent group.
 * Renders a `<div>` element.
 */
export const MenuGroupLabel = defineComponent(function MenuGroupLabel(
  componentProps: MenuGroupLabel.Props,
) {
  const {id: idProp} = componentProps;
  const children = toValue(componentProps.children);

  const id = useBaseUiId(idProp);
  const setLabelId = useMenuGroupRootContext();

  watch(
    () => id,
    () => {
      setLabelId(id);
      return () => {
        setLabelId((currentId: string | undefined) =>
          currentId === id ? undefined : currentId,
        );
      };
    },
    {flush: 'post', immediate: true},
  );

  return () => {
    const {render, className, style, ...elementProps} = componentProps as any;

    const merged: any = {
      id,
      role: 'presentation',
      ...elementProps,
    };

    const mergedRefs = (el: HTMLElement | null) => {
      if (typeof componentProps.ref === 'function') {
        (componentProps.ref as any)(el);
      } else if (componentProps.ref) {
        componentProps.ref.value = el;
      }
    };

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ref: mergedRefs} as any);
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof merged.className === 'string' && typeof renderClassName === 'string'
          ? `${merged.className} ${renderClassName}`.trim()
          : (merged.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={mergedRefs}>{children}</Tag>;
    }
    return <div {...merged} ref={mergedRefs}>{children}</div>;
  };
});

export interface MenuGroupLabelProps extends BaseUIComponentProps<'div', MenuGroupLabelState> {}

export interface MenuGroupLabelState {}

export namespace MenuGroupLabel {
  export type Props = MenuGroupLabelProps;
  export type State = MenuGroupLabelState;
}
