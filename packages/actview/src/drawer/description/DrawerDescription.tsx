import { defineComponent, toValue } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useDialogRootContext } from '@/dialog/root/DialogRootContext';
import { useBaseUiId } from '@/internals/useBaseUiId';

/**
 * A paragraph that describes the Drawer.
 * Renders a `<p>` element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/Drawer)
 */
export const DrawerDescription = defineComponent(function DrawerDescription(
  componentProps: DrawerDescription.Props,
) {
  const children = toValue(componentProps.children);
  const store = useDialogRootContext(false);

  const id = useBaseUiId((componentProps as any).id);

  store.useSyncedValueWithCleanup('descriptionElementId', id as any);

  return () => {
    const {render, className, style, ...elementProps} = componentProps as any;

    const merged: any = {
      id,
      ...elementProps,
    };

    const mergedRefs = (el: HTMLElement | null) => {
      if (typeof componentProps.ref === 'function') {
        (componentProps.ref as any)(el);
      } else if (componentProps.ref) {
        (componentProps.ref as any).value = el;
        (componentProps.ref as any).current = el;
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
        typeof className === 'string' && typeof renderClassName === 'string'
          ? `${className} ${renderClassName}`.trim()
          : (className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={mergedRefs}>{children}</Tag>;
    }
    return (
      <p {...merged} className={className} ref={mergedRefs}>
        {children}
      </p>
    );
  };
});

export interface DrawerDescriptionState {}

export interface DrawerDescriptionProps extends BaseUIComponentProps<'p', DrawerDescriptionState> {
  children?: any;
  [key: string]: any;
}

export namespace DrawerDescription {
  export type State = DrawerDescriptionState;
  export type Props = DrawerDescriptionProps;
}
