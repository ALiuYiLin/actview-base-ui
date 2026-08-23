import { defineComponent, computed, toValue } from 'actview';
import { useSelectRootContext } from '../root/SelectRootContext';

/** The popup of the select. Renders a `<div>` element when open. */
export const SelectPopup = defineComponent(function SelectPopup(props: SelectPopup.Props) {
  const store = useSelectRootContext(false);
  const children = toValue(props.children);
  const open = computed(() => store.useState('open').value);
  const mounted = computed(() => store.useState('mounted').value);

  return () => {
    if (!open.value && !mounted.value) {
      return null;
    }
    const {render, className, style, keepMounted, ...elementProps} = props as any;
    const merged: any = {...elementProps};
    const ref = (el: any) => {
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

export interface SelectPopupProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectPopup {
  export type Props = SelectPopupProps;
}
