import { toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * A paragraph that describes the popover.
 * Renders a `<p>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverDescription(componentProps: PopoverDescription.Props) {
  // ============ setup（只执行一次）：toRefs 解构——props 全部响应式 refs ============
  const store = usePopoverRootContext(false);
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

export interface PopoverDescriptionState {}

export interface PopoverDescriptionProps extends BaseUIComponentProps<'p', PopoverDescriptionState> {
  children?: any;
  [key: string]: any;
}

export namespace PopoverDescription {
  export type State = PopoverDescriptionState;
  export type Props = PopoverDescriptionProps;
}
