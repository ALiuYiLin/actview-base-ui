import { type Ref } from '@actview/core';
import { type VNode } from '@actview/jsx';
import type { BaseUIComponentProps, HTMLProps, RefValue } from '@/internals/types';
import { useFloatingPortalNode } from '@/floating-ui-actview/components/FloatingPortal';

type PortalContainer =
  | HTMLElement
  | ShadowRoot
  | { current?: HTMLElement | ShadowRoot | null; value?: HTMLElement | ShadowRoot | null }
  | Ref<HTMLElement | ShadowRoot | null>
  | null;

/**
 * `FloatingPortal` includes tabbable logic handling for focus management.
 * For components that don't need tabbable logic, use `FloatingPortalLite`.
 * @internal
 */
export function FloatingPortalLite(componentProps: FloatingPortalLite.Props<any>) {
  const getElementProps = () => {
    const {
      children: _children,
      container: _container,
      className: _className,
      render: _render,
      style: _style,
      ...elementProps
    } = componentProps;
    return elementProps as HTMLProps;
  };

  const { node: portalNode, subtree: portalSubtree } = useFloatingPortalNode({
    container: componentProps.container,
    ref: componentProps.ref,
    componentProps,
    elementProps: getElementProps,
  });

  return (
    <>
      {portalSubtree.value}
      {portalNode.value ? (
        <Teleport to={portalNode.value}>{componentProps.children}</Teleport>
      ) : null}
    </>
  );
}

export interface FloatingPortalLiteState {}

export interface FloatingPortalLiteProps<TState> extends BaseUIComponentProps<'div', TState> {
  container?: PortalContainer | undefined;
}

export namespace FloatingPortalLite {
  export type State = FloatingPortalLiteState;
  export type Props<TState> = FloatingPortalLiteProps<TState>;
}
