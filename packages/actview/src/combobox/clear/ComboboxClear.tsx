import { toRefs, unrefs } from 'actview';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** Clears the selected value. Renders a `<button>` element. */
export function ComboboxClear(props: ComboboxClear.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const context = useComboboxRootContext(false);
  const {render, className, style, children, ref, ...elementProps} = toRefs(props);

  const {element} = useRenderElement({
    props: () => [
      {
        type: 'button',
        'aria-label': 'Clear',
        ...unrefs(elementProps),
        onClick: () => {
          context.store.setSelectedValue(undefined);
          context.setInputValue('');
        },
      },
    ],
    className,
    style,
    render,
    refs: () => (props.ref !== undefined ? [ref] : []),
    children,
    defaultTag: 'button',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface ComboboxClearProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxClear {
  export type Props = ComboboxClearProps;
}
