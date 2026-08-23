import type { VNode, HTMLAttributes } from '@actview/jsx';
import type { BaseUIEvent, ComponentRenderFn, HTMLProps, MaybeRefOrGetter } from '../types';

export type { HTMLProps, ComponentRenderFn, BaseUIEvent, MaybeRefOrGetter };

export type Orientation = 'horizontal' | 'vertical';

export interface NativeButtonProps {
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * Set to `false` if the rendered element is not a button (for example, `<div>`).
   * @default true
   */
  nativeButton?: boolean | undefined;
}

export interface NonNativeButtonProps {
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * Set to `true` if the rendered element is a native button.
   * @default false
   */
  nativeButton?: boolean | undefined;
}

/**
 * Simplifies the display of a type (without modifying it).
 * Taken from https://effectivetypescript.com/2022/02/25/gentips-4-display/
 */
export type Simplify<T> = T extends Function ? T : { [K in keyof T]: T[K] };

/**
 * Makes specified keys in a type required.
 *
 * @template T - The original type.
 * @template K - The keys to make required.
 */
export type RequiredExcept<T, K extends keyof T> = Required<Omit<T, K>> & Pick<T, K>;

/**
 * Props shared by all Base UI components.
 * Contains `className` (string or callback taking the component's state as an argument)
 * and `render` (function or VNode to customize rendering).
 */
export interface BaseUIComponentProps<
  ElementType extends keyof JSX.IntrinsicElements,
  State,
  RenderFunctionProps = HTMLProps,
> extends Omit<HTMLAttributes, 'className' | 'style'> {
  /**
   * CSS class applied to the element, or a function that
   * returns a class based on the component's state.
   */
  className?: string | ((state: State) => string | undefined) | undefined;
  /**
   * Allows you to replace the component's HTML element
   * with a different tag, or compose it with another component.
   *
   * Accepts a `VNode` or a function that returns the element to render.
   */
  render?: VNode | ComponentRenderFn<RenderFunctionProps, State> | undefined;
  /**
   * Style applied to the element, or a function that
   * returns a style object based on the component's state.
   */
  style?:
    | string
    | Record<string, string | number>
    | ((state: State) => string | Record<string, string | number> | undefined)
    | undefined;
}
