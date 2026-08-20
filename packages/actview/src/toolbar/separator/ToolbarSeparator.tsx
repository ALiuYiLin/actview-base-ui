import { defineComponent } from 'actview';
import type { Orientation } from '../../internals/types';
import { Separator, type SeparatorState } from '../../separator';
import { useToolbarRootContext } from '../root/ToolbarRootContext';

/**
 * A separator element accessible to screen readers.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export const ToolbarSeparator = defineComponent(function (componentProps: ToolbarSeparator.Props) {
  // context hook 必须在 setup 顶层（AD-42），渲染期读 .value 建立响应式
  const rootContext = useToolbarRootContext();

  return () => {
    // 默认与 toolbar 方向相反（horizontal toolbar → vertical separator）；
    // 用户显式传 orientation 优先
    const toolbarOrientation = rootContext.value.orientation;
    const orientation =
      componentProps.orientation ?? (toolbarOrientation === 'vertical' ? 'horizontal' : 'vertical');

    // 委托给 Separator（已重构为 defineComponent）：透传全部 props，
    // 由 Separator 内部 rootRef 绑定 DOM、处理 render 三形态与 className/style 函数解析
    return (
      <Separator
        {...componentProps}
        orientation={orientation}
        className={componentProps.className as any}
        style={componentProps.style as any}
      />
    );
  };
}) as (props: ToolbarSeparator.Props) => any;

export interface ToolbarSeparatorState extends SeparatorState {}

export interface ToolbarSeparatorProps extends Separator.Props {
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
