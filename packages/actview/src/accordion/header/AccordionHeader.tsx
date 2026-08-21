import { computed, defineComponent, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import type { AccordionItemState } from '../item/AccordionItem';
import { useAccordionItemContext } from '../item/AccordionItemContext';
import { accordionStateAttributesMapping } from '../item/stateAttributesMapping';
import { getStateAttributesProps } from '../../internals/getStateAttributesProps';
import { mergePropsN } from '../../merge-props';

/**
 * A heading that labels the corresponding panel.
 * Renders an `<h3>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export const AccordionHeader = defineComponent(function (componentProps: AccordionHeader.Props) {
  // ================= setup（只执行一次） =================
  const rootRef = useRootElement();

  const itemContext = useAccordionItemContext();

  const state = computed<AccordionHeaderState>(() => itemContext.value.state);

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      style,
      ref: _ref,
      ...elementProps
    } = componentProps;

    const stateValue = state.value;

    const stateAttributes = getStateAttributesProps(stateValue, accordionStateAttributesMapping);

    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      {
        className: typeof className === 'function' ? className(stateValue) : className,
        style: typeof style === 'function' ? style(stateValue) : style,
      },
    ]);

    // render 三形态
    if (typeof render === 'function') {
      return render({ ...merged, ...stateValue, ref: rootRef });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />;
    }
    return <h3 ref={rootRef} {...merged} />;
  };
}) as (props: AccordionHeader.Props) => any;

export interface AccordionHeaderState extends AccordionItemState {}

export interface AccordionHeaderProps extends BaseUIComponentProps<'h3', AccordionHeaderState> {}

export namespace AccordionHeader {
  export type State = AccordionHeaderState;
  export type Props = AccordionHeaderProps;
}