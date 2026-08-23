import { defineComponent, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps, Orientation } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { mergeClassNames, mergeStyles } from '@/utils/mergeClassNames';

/**
 * A separator element accessible to screen readers.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Separator](https://base-ui.com/react/components/separator)
 */
export const Separator = defineComponent(function (componentProps: Separator.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {className, render, orientation = 'horizontal', style, ...elementProps} = componentProps;

    const state: SeparatorState = {
      orientation,
    };

    // state → data-* 属性（orientation → data-orientation）+ 静态 a11y 属性
    const stateAttributes = getStateAttributesProps(state);
    const staticProps: HTMLProps = {role: 'separator', 'aria-orientation': orientation};

    // merged 顺序对齐 React 契约：静态属性 + elementProps + stateAttributes
    // → className/style 后置覆盖
    const merged: HTMLProps = {};
    Object.assign(merged, staticProps, elementProps, stateAttributes);
    if (typeof className === 'function') {
      merged.className = className(state);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = style(state);
    } else if (style !== undefined) {
      merged.style = style;
    }

    // render 三形态（MIGRATION.md case 3：VNode 分支 mergeProps 合并——
    // 事件处理器链式合并、className 拼接、style 浅合并，ref 兜底放最后）
    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...state, ref: rootRef});
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className = mergeClassNames(merged.className, renderClassName);
      mergedRenderProps.style = mergeStyles(merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
    }
    return <div {...merged} ref={rootRef} />;
  };
}) as unknown as (props: Separator.Props) => JSX.Element;

export interface SeparatorProps extends BaseUIComponentProps<'div', SeparatorState> {
  /**
   * The orientation of the separator.
   * @default 'horizontal'
   */
  orientation?: Orientation | undefined;
}

export interface SeparatorState {
  /**
   * The orientation of the separator.
   */
  orientation: Orientation;
}

export namespace Separator {
  export type Props = SeparatorProps;
  export type State = SeparatorState;
}
