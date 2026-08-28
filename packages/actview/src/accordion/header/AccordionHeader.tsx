import { toValue, toRefs, unrefs } from 'actview';
import type { BaseUIComponentProps } from '@/internals/types';
import type { AccordionItemState } from '../item/AccordionItem';
import { useAccordionItemContext } from '../item/AccordionItemContext';
import { accordionStateAttributesMapping } from '../item/stateAttributesMapping';
import { useRenderElement } from '@/internals/useRenderElementLegacy';
import { useRootElementFragment } from '@/internals/useRootElementFragment';

/**
 * A heading that labels the corresponding panel.
 * Renders an `<h3>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export function AccordionHeader(componentProps: AccordionHeader.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Fragment 根（`<>{element()}</>`）下 actview 内置 useRootElement 的
  // subTree.el 恒 null——用 Fragment 兼容版本。
  const rootRef = useRootElementFragment();
  const {state} = toValue(useAccordionItemContext());

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => [{...unrefs(elementProps)}],
    state: () => toValue(state),
    stateAttributesMapping: accordionStateAttributesMapping,
    className,
    style,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'h3',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

export interface AccordionHeaderState extends AccordionItemState {}

export interface AccordionHeaderProps extends BaseUIComponentProps<'h3', AccordionHeaderState> {}

export namespace AccordionHeader {
  export type State = AccordionHeaderState;
  export type Props = AccordionHeaderProps;
}
