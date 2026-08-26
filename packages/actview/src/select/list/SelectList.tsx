import { toRefs, unrefs } from 'actview';
import { useSelectRootContext } from '../root/SelectRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** A list of select items. Renders a `<div>` element with role listbox. */
export function SelectList(props: SelectList.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const store = useSelectRootContext(false);
  const {render, className, style, children, ref: refProp, ...elementProps} = toRefs(props);

  const {element} = useRenderElement({
    props: () => [{'role': 'listbox'}, unrefs(elementProps)],
    className,
    style,
    render,
    refs: () => {
      const refs: any[] = [
        (el: any) => {
          store.setListElement(el ?? null);
        },
      ];
      if (props.ref !== undefined) {
        refs.push(refProp);
      }
      return refs;
    },
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface SelectListProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectList {
  export type Props = SelectListProps;
}
