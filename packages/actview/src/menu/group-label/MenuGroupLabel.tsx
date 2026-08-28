import { toRefs, unrefs, watch } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useMenuGroupRootContext } from '../group/MenuGroupContext';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * An accessible label that is automatically associated with its parent group.
 * Renders a `<div>` element.
 */
export function MenuGroupLabel(componentProps: MenuGroupLabel.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const {id: idProp} = componentProps;
  const {render, className, style, children, ref: refProp, ...elementProps} = toRefs(componentProps);

  const id = useBaseUiId(idProp);
  const setLabelId = useMenuGroupRootContext();

  watch(
    () => id,
    () => {
      setLabelId(id);
      return () => {
        setLabelId((currentId: string | undefined) =>
          currentId === id ? undefined : currentId,
        );
      };
    },
    {flush: 'post', immediate: true},
  );

  const {element} = useRenderElement({
    props: () => [{id, role: 'presentation'}, unrefs(elementProps)],
    className,
    style,
    render,
    refs: () => (componentProps.ref !== undefined ? [refProp as any] : []),
    children,
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface MenuGroupLabelProps extends BaseUIComponentProps<'div', MenuGroupLabelState> {}

export interface MenuGroupLabelState {}

export namespace MenuGroupLabel {
  export type Props = MenuGroupLabelProps;
  export type State = MenuGroupLabelState;
}
