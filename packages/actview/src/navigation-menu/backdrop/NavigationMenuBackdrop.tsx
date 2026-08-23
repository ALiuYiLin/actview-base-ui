import { defineComponent, computed, toValue } from 'actview';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';

/** A backdrop for the popup. Renders a `<div>` element. */
export const NavigationMenuBackdrop = defineComponent(function NavigationMenuBackdrop(
  props: NavigationMenuBackdrop.Props,
) {
  const children = toValue(props.children);
  const context = useNavigationMenuRootContext(false);
  const open = computed(() => context.openRef.value);

  return () => {
    if (!open.value) {
      return null;
    }
    const {render, className, style, ...elementProps} = props as any;
    const merged: any = {...elementProps};
    if (render) {
      if (typeof render === 'function') return render({...merged} as any);
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} />;
    }
    return <div {...merged}>{children}</div>;
  };
});

export interface NavigationMenuBackdropProps {
  children?: any;
  [key: string]: any;
}

export namespace NavigationMenuBackdrop {
  export type Props = NavigationMenuBackdropProps;
}
