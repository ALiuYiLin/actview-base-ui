import { defineComponent, computed, toValue } from 'actview';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';

/** Renders the popup when the menu is open. Renders a `<div>` element. */
export const NavigationMenuPopup = defineComponent(function NavigationMenuPopup(
  props: NavigationMenuPopup.Props,
) {
  const context = useNavigationMenuRootContext(false);
  const children = toValue(props.children);
  const open = computed(() => context.openRef.value);

  return () => {
    if (!open.value) {
      return null;
    }
    const {render, className, style, ...elementProps} = props as any;
    const merged: any = {...elementProps};
    const ref = (el: any) => {
      context.setPopupElement(el ?? null);
      if (props.ref) {
        if (typeof props.ref === 'function') (props.ref as any)(el);
        else {
          (props.ref as any).value = el;
          (props.ref as any).current = el;
        }
      }
    };
    if (render) {
      if (typeof render === 'function') return render({...merged, ref} as any);
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} ref={ref}>{children}</Tag>;
    }
    return <div {...merged} ref={ref}>{children}</div>;
  };
});

export interface NavigationMenuPopupProps {
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuPopup {
  export type Props = NavigationMenuPopupProps;
}
