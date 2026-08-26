import { toRefs, unrefs } from 'actview';
import { useSelectItemContext } from '../item/SelectItemContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** Shows a checkmark when the item is selected. Renders a `<span>` element. */
export function SelectItemIndicator(props: SelectItemIndicator.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const context = useSelectItemContext(false);
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
  return <>{!context.selected ? null : element()}</>;
}

export interface SelectItemIndicatorProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectItemIndicator {
  export type Props = SelectItemIndicatorProps;
}
