import { defineComponent, toValue } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { useBaseUiId } from '@/internals/useBaseUiId';

/**
 * A heading that labels the popover.
 * Renders an `<h2>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export const PopoverTitle = defineComponent(function PopoverTitle(
  componentProps: PopoverTitle.Props,
) {
  const children = toValue(componentProps.children);
  const store = usePopoverRootContext(false);

  const id = useBaseUiId((componentProps as any).id);

  store.useSyncedValueWithCleanup('titleElementId', id as any);

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
      <h2 {...merged} className={className} ref={mergedRefs}>
        {children}
      </h2>
    );
  };
});

export interface PopoverTitleState {}

export interface PopoverTitleProps
  extends BaseUIComponentProps<'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6', PopoverTitleState> {
  children?: any;
  [key: string]: any;
}

export namespace PopoverTitle {
  export type State = PopoverTitleState;
  export type Props = PopoverTitleProps;
}
