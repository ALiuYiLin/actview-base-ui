import { defineComponent, ref, toValue } from 'actview';
import { MenuGroupContext, type MenuGroupContextValue } from './MenuGroupContext';

/**
 * Groups related menu items with the corresponding label.
 * Renders a `<div>` element.
 */
export const MenuGroup = defineComponent(function MenuGroup(componentProps: MenuGroup.Props) {
  const children = toValue(componentProps.children);
  const labelId = ref<string | undefined>(undefined);

  const setLabelId: MenuGroupContextValue = (value) => {
    labelId.value =
      typeof value === 'function'
        ? (value as any)(labelId.value)
        : value;
  };

  return () => {
    const {render, className, style, ...elementProps} = componentProps as any;

    const merged: any = {
      role: 'group',
      'aria-labelledby': labelId.value,
      ...elementProps,
    };

    const mergedRefs = (el: HTMLElement | null) => {
      if (typeof componentProps.ref === 'function') {
        (componentProps.ref as any)(el);
      } else if (componentProps.ref) {
        componentProps.ref.value = el;
      }
    };

    const element = (() => {
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
    })();

    return <MenuGroupContext.Provider value={setLabelId}>{element}</MenuGroupContext.Provider>;
  };
});

export interface MenuGroupProps {
  /**
   * The content of the component.
   */
  children?: any;
  [key: string]: any;
}

export interface MenuGroupState {}

export namespace MenuGroup {
  export type Props = MenuGroupProps;
  export type State = MenuGroupState;
}
