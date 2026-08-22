import type { ComponentType } from '@actview/jsx';
import type { VNode } from '@actview/jsx';
import type { ComponentRenderFn, RefValue } from '@/internals/types';
import { HTMLProps } from '@/internals/types';
import { useRenderElement } from '@/internals/useRenderElement';
import { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import type { StyleValue } from '@/internals/types';

/**
 * Renders a Base UI element.
 *
 * Returns a getter function that must be invoked inside JSX (ActView semantics:
 * the render prop, state attributes and props are re-evaluated on every call).
 *
 * @public
 */
export function useRender<
  State extends Record<string, unknown>,
  RenderedElementType extends Element,
  Enabled extends boolean | undefined = undefined,
>(
  params: useRender.Parameters<State, RenderedElementType, Enabled>,
): () => VNode | null {
  return useRenderElement(
    params.defaultTagName ?? 'div',
    params as never,
    params as never,
  );
}

export type UseRenderRenderProp<State = Record<string, unknown>> =
  | VNode
  | ComponentRenderFn<HTMLProps, State>;

export type UseRenderElementProps<ElementType extends ComponentType<any>> = JSXPropsOfShim<
  ElementType
> & { ref?: RefValue };

// @actview/jsx's PropsOf derives props from `{ __setup }` components.
type JSXPropsOfShim<ElementType> = ElementType extends { __setup: (props: infer P) => any }
  ? P
  : Record<string, any>;

export type UseRenderComponentProps<
  ElementType extends ComponentType<any>,
  State = {},
  RenderFunctionProps = HTMLProps,
> = JSXPropsOfShim<ElementType> & {
  /**
   * Allows you to replace the component's HTML element
   * with a different tag, or compose it with another component.
   *
   * Accepts a `VNode` or a function that returns the element to render.
   */
  render?: VNode | ComponentRenderFn<RenderFunctionProps, State> | undefined;
};

export interface UseRenderParameters<
  State,
  RenderedElementType extends Element,
  Enabled extends boolean | undefined,
> {
  /**
   * The VNode or a function that returns one to override the default element.
   */
  render?: UseRenderRenderProp<State> | undefined;
  /**
   * The ref to apply to the rendered element.
   */
  ref?: RefValue<RenderedElementType> | RefValue<RenderedElementType>[] | undefined;
  /**
   * The state of the component, passed as the second argument to the `render` callback.
   * State properties are automatically converted to data-* attributes.
   */
  state?: State | undefined;
  /**
   * Custom mapping for converting state properties to data-* attributes.
   * @example
   * { isActive: (value) => (value ? { 'data-is-active': '' } : null) }
   */
  stateAttributesMapping?: StateAttributesMapping<State> | undefined;
  /**
   * Props to be spread on the rendered element.
   * They are merged with the internal props of the component, so that event handlers
   * are merged, `className` strings and `style` properties are joined, while other external props overwrite the
   * internal ones.
   */
  props?: Record<string, unknown> | undefined;
  /**
   * If `false`, the hook will skip most of its internal logic and return `null`.
   * This is useful for rendering a component conditionally.
   * @default true
   */
  enabled?: Enabled | undefined;
  /**
   * The default tag name to use for the rendered element when `render` is not provided.
   * @default 'div'
   */
  defaultTagName?: keyof JSX.IntrinsicElements | undefined;
}

export type UseRenderReturnValue<Enabled extends boolean | undefined> = Enabled extends false
  ? () => null
  : () => VNode | null;

export interface UseRenderState {}

export namespace useRender {
  export type State = UseRenderState;
  export type RenderProp<TState = Record<string, unknown>> = UseRenderRenderProp<TState>;

  export type ElementProps<ElementType extends ComponentType<any>> =
    UseRenderElementProps<ElementType>;

  export type ComponentProps<
    ElementType extends ComponentType<any>,
    TState = {},
    RenderFunctionProps = HTMLProps,
  > = UseRenderComponentProps<ElementType, TState, RenderFunctionProps>;

  export type Parameters<
    TState,
    RenderedElementType extends Element,
    Enabled extends boolean | undefined,
  > = UseRenderParameters<TState, RenderedElementType, Enabled>;

  export type ReturnValue<Enabled extends boolean | undefined> = UseRenderReturnValue<Enabled>;
}
