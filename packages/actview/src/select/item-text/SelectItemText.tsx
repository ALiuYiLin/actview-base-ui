import { toRefs, unrefs } from 'actview';
import { useSelectItemContext } from '../item/SelectItemContext';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/** The text of the item. Renders a `<span>` element. */
export function SelectItemText(props: SelectItemText.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const context = useSelectItemContext(true);
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

export interface SelectItemTextProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectItemText {
  export type Props = SelectItemTextProps;
}
