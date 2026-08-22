import { defineComponent, ref, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import type { AccordionItemState } from '@/accordion/item/AccordionItemContext';
import { useAccordionItemContext } from '@/accordion/item/AccordionItemContext';
import { accordionStateAttributesMapping } from '@/accordion/item/stateAttributesMapping';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { mergeClassNames, mergeStyles } from '@/utils/mergeClassNames';

/**
 * A heading that labels the corresponding panel.
 * Renders an `<h3>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export const AccordionHeader = defineComponent(function (componentProps: AccordionHeader.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 根是元素（<h3>）→ useRootElement() 自动绑定（MIGRATION.md case 6）
  const rootRef = ref<HTMLElement | null>(null);
  // context hook 必须在 setup 顶层调用（AD-42）
  const itemContext = useAccordionItemContext();

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const { render, className, style, ...elementProps } = componentProps;

    // state 纯对象：渲染期每次从 context 取最新值（非 computed）
    const state: AccordionHeaderState = itemContext.value.state;

    const stateAttributes = getStateAttributesProps(state, accordionStateAttributesMapping);

    // merged 顺序对齐 React 契约：[stateAttributes, elementProps, {className, style}]
    // （Object.assign 合并避免 Record<string,string> 索引签名污染字面量类型）
    const merged: HTMLProps = {};
    Object.assign(merged, stateAttributes, elementProps);
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

    // render 三形态（MIGRATION.md case 3：VNode 分支按 React 契约**合并**——
    // className/style 提取后与 merged 合并（两者都保留），其余 props render
    // 元素优先，ref 由组件兜底放最后）
    if (render) {
      if (typeof render === 'function') {
        return render({ ...merged, ...state, ref: rootRef });
      }
      const renderProps = render.props ?? {};
      const { className: renderClassName, style: renderStyle, ...restRenderProps } = renderProps;
      const Tag = render.type as any;
      return (
        <Tag
          key={render.key}
          {...merged}
          {...restRenderProps}
          className={mergeClassNames(renderClassName, merged.className)}
          style={mergeStyles(renderStyle, merged.style)}
          ref={rootRef}
        />
      );
    }
    return <h3 {...merged} ref={rootRef} />;
  };
}) as unknown as (props: AccordionHeader.Props) => JSX.Element;

export interface AccordionHeaderState extends AccordionItemState {}

export interface AccordionHeaderProps extends BaseUIComponentProps<'h3', AccordionHeaderState> {}

export namespace AccordionHeader {
  export type State = AccordionHeaderState;
  export type Props = AccordionHeaderProps;
}
