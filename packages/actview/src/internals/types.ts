import type { VNode, HTMLAttributes } from '@actview/jsx';
import type { ComponentRenderFn, HTMLProps } from '../types';

export type { HTMLProps, ComponentRenderFn };

export type Orientation = 'horizontal' | 'vertical';

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
