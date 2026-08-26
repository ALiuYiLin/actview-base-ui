import { toRefs, unrefs } from 'actview';
import { useRenderElement } from '@/internals/useRenderElement';

/** A separator between combobox items. Renders a `<div>` element. */
export function ComboboxSeparator(props: ComboboxSeparator.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {render, className, style, children, ...elementProps} = toRefs(props);

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    className,
    style,
    render,
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface ComboboxSeparatorProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxSeparator {
  export type Props = ComboboxSeparatorProps;
}
