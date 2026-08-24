import { defineComponent, toValue, computed } from 'actview';
import { useComboboxRootContext } from '../root/ComboboxRootContext';

/** A list of combobox items. Renders a `<div>` element with role listbox. */
export const ComboboxList = defineComponent(function ComboboxList(props: ComboboxList.Props) {
  const context = useComboboxRootContext(false);
  const rawChildren = props.children;
  const items = computed(() => context.itemsRef.value);

  return () => {
    const {render, className, style, ...elementProps} = props as any;
    const merged: any = {
      role: 'listbox',
      ...elementProps,
    };
    const ref = (el: any) => {
      context.store.setListElement(el ?? null);
      if (props.ref) {
        if (typeof props.ref === 'function') (props.ref as any)(el);
        else {
          (props.ref as any).value = el;
          
        }
      }
    };
    const child =
      typeof rawChildren === 'function' ? rawChildren({items: items.value}) : toValue(rawChildren);
    if (render) {
      if (typeof render === 'function') return render({...merged, ref} as any);
      const Tag = render.type as any;
      return <Tag {...render.props} {...merged} ref={ref}>{child}</Tag>;
    }
    return <div {...merged} ref={ref}>{child}</div>;
  };
});

export interface ComboboxListProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxList {
  export type Props = ComboboxListProps;
}
