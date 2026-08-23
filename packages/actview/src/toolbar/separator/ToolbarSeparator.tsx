import { defineComponent, toValue } from 'actview';
import { useToolbarRootContext } from '../root/ToolbarRootContext';
import { Separator } from '@/separator/Separator';
import type { SeparatorProps, SeparatorState } from '@/separator/Separator';
import type { Orientation } from '@/internals/types';

/**
 * A separator that visually divides toolbar sections.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export const ToolbarSeparator = defineComponent(function (props: ToolbarSeparator.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootContextRef = useToolbarRootContext();

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const orientationProp = toValue(props.orientation);

    const context = rootContextRef.value;
    const orientation = orientationProp ?? (context.orientation === 'vertical' ? 'horizontal' : 'vertical');

    return <Separator orientation={orientation} {...(props as any)} />;
  };
}) as unknown as (props: ToolbarSeparator.Props) => JSX.Element;

export interface ToolbarSeparatorState extends SeparatorState {}

export interface ToolbarSeparatorProps extends SeparatorProps {
  /**
   * The orientation of the separator. Defaults to the opposite of the toolbar's
   * orientation, so a horizontal toolbar renders vertical separators.
   */
  orientation?: Orientation | undefined;
}

export namespace ToolbarSeparator {
  export type State = ToolbarSeparatorState;
  export type Props = ToolbarSeparatorProps;
}
