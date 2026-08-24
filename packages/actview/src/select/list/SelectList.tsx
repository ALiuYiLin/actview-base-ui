import { defineComponent, toValue } from 'actview';
import { useSelectRootContext } from '../root/SelectRootContext';

/** A list of select items. Renders a `<div>` element with role listbox. */
export const SelectList = defineComponent(function SelectList(props: SelectList.Props) {
  const store = useSelectRootContext(false);
  const children = toValue(props.children);

  return () => {
    const {render, className, style, ...elementProps} = props as any;
    const merged: any = {
      role: 'listbox',
      ...elementProps,
    };
    const ref = (el: any) => {
      store.setListElement(el ?? null);
      if (props.ref) {
        if (typeof props.ref === 'function') (props.ref as any)(el);
        else {
          (props.ref as any).value = el;
          
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

export interface SelectListProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectList {
  export type Props = SelectListProps;
}
