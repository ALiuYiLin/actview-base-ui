import { toRefs, unrefs } from 'actview';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** The value of the combobox. Renders a `<span>` element. */
export function ComboboxValue(componentProps: ComboboxValue.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const context = useComboboxRootContext(false);
  const {render, className, style, children, placeholder, ...elementProps} =
    toRefs(componentProps);

  // useState 必须在 setup 调用（useStore 内部注册 onUnmounted）。
  const value = context.store.useState('selectedValue');

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

export interface ComboboxValueProps {
  /**
   * The placeholder to display when no value is selected.
   */
  placeholder?: any;
  children?: any;
  [key: string]: any;
}

export namespace ComboboxValue {
  export type Props = ComboboxValueProps;
}
