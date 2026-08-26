import { toRefs, unrefs, computed } from 'actview';
import { useSelectRootContext } from '../root/SelectRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** The value of the select. Renders a `<span>` element. */
export function SelectValue(componentProps: SelectValue.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const store = useSelectRootContext(false);
  const {render, className, style, children, placeholder, ...elementProps} = toRefs(componentProps);

  const valueState = store.useState('value');
  const value = computed(() => valueState.value);

  const hasValue = () => {
    const selectedValue = value.value;
    return selectedValue != null && String(selectedValue) !== '';
  };

  const {element} = useRenderElement({
    props: () => [
      {
        ...unrefs(elementProps),
        'data-placeholder': !hasValue() ? '' : undefined,
      },
    ],
    className,
    style,
    render,
    children: () => {
      const selectedValue = value.value;
      const child = children?.value;
      let display: any = child;
      if (typeof child === 'function') {
        display = child({value: selectedValue});
      } else if (display == null && hasValue()) {
        display = String(selectedValue);
      } else if (display == null) {
        display = placeholder?.value ?? '';
      }
      return display;
    },
    defaultTag: 'span',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface SelectValueProps {
  /**
   * The placeholder to display when no value is selected.
   */
  placeholder?: any;
  children?: any;
  [key: string]: any;
}

export namespace SelectValue {
  export type Props = SelectValueProps;
}
