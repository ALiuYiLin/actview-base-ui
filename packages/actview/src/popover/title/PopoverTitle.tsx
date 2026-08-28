import { toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * A heading that labels the popover.
 * Renders an `<h2>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverTitle(componentProps: PopoverTitle.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const store = usePopoverRootContext(false);
  const {render, className, style, children, ref: refProp, ...elementProps} =
    toRefs(componentProps);

  const id = useBaseUiId((componentProps as any).id);

  store.useSyncedValueWithCleanup('titleElementId', id as any);

  const {element} = useRenderElement({
    props: () => [{id, ...unrefs(elementProps)}],
    className,
    style,
    render,
    refs: () => (componentProps.ref !== undefined ? [refProp as any] : []),
    children,
    defaultTag: 'h2',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface PopoverTitleState {}

export interface PopoverTitleProps
  extends BaseUIComponentProps<'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6', PopoverTitleState> {
  children?: any;
  [key: string]: any;
}

export namespace PopoverTitle {
  export type State = PopoverTitleState;
  export type Props = PopoverTitleProps;
}
