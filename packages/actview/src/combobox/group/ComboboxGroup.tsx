import { toRefs, unrefs } from 'actview';
import { useRenderElement } from '@/internals/useRenderElement';

/** Groups combobox items. Renders a `<div>` element. */
export function ComboboxGroup(props: ComboboxGroup.Props) {
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

export interface ComboboxGroupProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxGroup {
  export type Props = ComboboxGroupProps;
}
