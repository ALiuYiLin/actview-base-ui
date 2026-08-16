import { computed, ref } from 'actview';
import { FieldsetRootContext, useFieldsetRootContext } from './FieldsetRootContext';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * Groups a shared legend with related controls.
 * Renders a `<fieldset>` element.
 *
 * Documentation: [Base UI Fieldset](https://base-ui.com/react/components/fieldset)
 */
export function FieldsetRoot(componentProps: FieldsetRoot.Props) {
  const legendId = ref<string | undefined>(undefined);
  const setLegendId = (id: string | undefined) => {
    legendId.value = id;
  };

  const parentContext = useFieldsetRootContext(true);

  const disabled = computed(
    () => (parentContext.value?.disabled ?? false) || (componentProps.disabled ?? false),
  );

  const state = computed<FieldsetRootState>(() => ({
    disabled: disabled.value,
  }));

  const getRootProps = () => ({
    'aria-labelledby': legendId.value,
    disabled: disabled.value,
  });

  const getElementProps = () => {
    const {
      render: _render,
      className: _className,
      style: _style,
      disabled: _disabled,
      ref: _ref,
      ...elementProps
    } = componentProps;
    return elementProps;
  };

  const getElement = useRenderElement('fieldset', componentProps, {
    state,
    ref: componentProps.ref,
    props: [getRootProps, getElementProps],
  });

  const contextValue = computed<FieldsetRootContext>(() => ({
    legendId: legendId.value,
    setLegendId,
    disabled: disabled.value,
  }));

  return <FieldsetRootContext.Provider value={contextValue}>{getElement()}</FieldsetRootContext.Provider>;
}

export interface FieldsetRootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface FieldsetRootProps extends BaseUIComponentProps<'fieldset', FieldsetRootState> {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled?: boolean | undefined;
}

export namespace FieldsetRoot {
  export type State = FieldsetRootState;
  export type Props = FieldsetRootProps;
}
