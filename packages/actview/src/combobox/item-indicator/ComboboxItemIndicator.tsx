import { toRefs, unrefs } from 'actview';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/** Shows a checkmark when the item is selected. Renders a `<span>` element. */
export function ComboboxItemIndicator(props: ComboboxItemIndicator.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {render, className, style, children, ...elementProps} = toRefs(props);

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    className,
    style,
    render,
    children,
    defaultTag: 'span',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface ComboboxItemIndicatorProps {
  children?: any;
  [key: string]: any;
}

export namespace ComboboxItemIndicator {
  export type Props = ComboboxItemIndicatorProps;
}
