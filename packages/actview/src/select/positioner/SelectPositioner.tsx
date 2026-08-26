import { toRefs, unrefs } from 'actview';
import { useSelectRootContext } from '../root/SelectRootContext';
import { useRenderElement } from '@/internals/useRenderElement';

/** Positions the popup. Renders a `<div>` element. actview 简化：无定位计算。 */
export function SelectPositioner(props: SelectPositioner.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const store = useSelectRootContext(false);
  const {render, className, style, children, ref: refProp, ...elementProps} = toRefs(props);

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    className,
    style,
    render,
    refs: () => {
      const refs: any[] = [
        (el: any) => {
          store.setPositionerElement(el ?? null);
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

export interface SelectPositionerProps {
  children?: any;
  [key: string]: any;
}

export namespace SelectPositioner {
  export type Props = SelectPositionerProps;
}
