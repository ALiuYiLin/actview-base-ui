import { defineComponent, ref, toValue, useRootElement } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { FieldsetRootContext, useFieldsetRootContext } from './FieldsetRootContext';

/**
 * Groups a shared legend with related controls.
 * Renders a `<fieldset>` element.
 *
 * Documentation: [Base UI Fieldset](https://base-ui.com/react/components/fieldset)
 */
export const FieldsetRoot = defineComponent(function (componentProps: FieldsetRoot.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const legendId = ref<string | undefined>(undefined);
  const setLegendId = (
    v: string | undefined | ((prev: string | undefined) => string | undefined),
  ) => {
    legendId.value = typeof v === 'function' ? v(legendId.value) : v;
  };

  const parentDisabled = useFieldsetRootContext(true).value?.disabled;
  const disabledProp = (componentProps as any).disabled ?? false;
  const disabled = computedFieldsetDisabled(disabledProp, parentDisabled);

  const state = () => ({
    disabled: disabled(),
  });

  const contextValue: FieldsetRootContext = {
    legendId: legendId.value,
    setLegendId,
    disabled: disabled(),
  };

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {className, render, style, ...elementProps} = componentProps;

    const stateValue = state();
    const stateAttributes = getStateAttributesProps(stateValue, {});

    const merged: HTMLProps = {};
    Object.assign(merged, {'aria-labelledby': legendId.value, disabled: disabled()}, elementProps, stateAttributes);
    if (typeof className === 'function') {
      merged.className = className(stateValue);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = style(stateValue);
    } else if (style !== undefined) {
      merged.style = style;
    }

    let element: any;
    if (render) {
      if (typeof render === 'function') {
        element = render({...merged, ...stateValue, ref: rootRef});
      } else {
        const renderProps = render.props ?? {};
        const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
        const Tag = render.type as any;
        const mergedRenderProps = Object.assign({}, merged, restRenderProps);
        mergedRenderProps.className =
          typeof merged.className === 'string' && typeof renderClassName === 'string'
            ? `${merged.className} ${renderClassName}`.trim()
            : (merged.className ?? renderClassName);
        mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
        element = <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
      }
    } else {
      element = <fieldset {...merged} ref={rootRef} />;
    }

    return <FieldsetRootContext.Provider value={contextValue}>{element}</FieldsetRootContext.Provider>;
  };
}) as unknown as (props: FieldsetRoot.Props) => JSX.Element;

function computedFieldsetDisabled(disabledProp: boolean, parentDisabled: boolean | undefined) {
  return () => parentDisabled || disabledProp;
}

export interface FieldsetRootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface FieldsetRootProps extends BaseUIComponentProps<'fieldset', FieldsetRootState> {}

export namespace FieldsetRoot {
  export type State = FieldsetRootState;
  export type Props = FieldsetRootProps;
}
