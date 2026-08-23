import { defineComponent, toValue, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useSwitchRootContext } from '../root/SwitchRootContext';
import { stateAttributesMapping } from '../stateAttributesMapping';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import type { SwitchRootState } from '../root/SwitchRoot';

/**
 * Visualizes the "on" or "off" state of the switch.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Switch](https://base-ui.com/react/components/switch)
 */
export const SwitchThumb = defineComponent(function (componentProps: SwitchThumb.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const rootContextRef = useSwitchRootContext();

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {render, className, style, ...elementProps} = componentProps;

    const state = rootContextRef.value;
    const stateAttributes = getStateAttributesProps(state, stateAttributesMapping);

    const merged: HTMLProps = {};
    Object.assign(merged, elementProps, stateAttributes);
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

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...state, ref: rootRef} as any);
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof merged.className === 'string' && typeof renderClassName === 'string'
          ? `${merged.className} ${renderClassName}`.trim()
          : (merged.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
    }
    return <span {...merged} ref={rootRef} />;
  };
}) as unknown as (props: SwitchThumb.Props) => JSX.Element;

export interface SwitchThumbProps extends BaseUIComponentProps<'span', SwitchThumbState> {}

export interface SwitchThumbState extends SwitchRootState {}

export namespace SwitchThumb {
  export type Props = SwitchThumbProps;
  export type State = SwitchThumbState;
}
