import { toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { useDialogRootContext } from '@/dialog/root/DialogRootContext';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useRenderElement } from '@/internals/useRenderElement';

/**
 * A paragraph that describes the Drawer.
 * Renders a `<p>` element.
 *
 * Documentation: [Base UI Drawer](https://base-ui.com/react/components/Drawer)
 */
export function DrawerDescription(componentProps: DrawerDescription.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const store = useDialogRootContext(false);
  const {render, className, style, children, ref: refProp, ...elementProps} =
    toRefs(componentProps);

  const id = useBaseUiId((componentProps as any).id);

  store.useSyncedValueWithCleanup('descriptionElementId', id as any);

  const {element} = useRenderElement({
    props: () => [{id, ...unrefs(elementProps)}],
    className,
    style,
    render,
    refs: () => (componentProps.ref !== undefined ? [refProp as any] : []),
    children,
    defaultTag: 'p',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface DrawerDescriptionState {}

export interface DrawerDescriptionProps extends BaseUIComponentProps<'p', DrawerDescriptionState> {
  children?: any;
  [key: string]: any;
}

export namespace DrawerDescription {
  export type State = DrawerDescriptionState;
  export type Props = DrawerDescriptionProps;
}
