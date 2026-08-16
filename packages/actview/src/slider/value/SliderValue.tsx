import { computed } from 'actview';
import type { VNodeChild } from '@actview/jsx';
import { formatNumber } from '@base-ui/actview-utils/formatNumber';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';
import type { SliderRootState } from '../root/SliderRoot';

/**
 * Displays the current value of the slider as text.
 * Renders an `<output>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export function SliderValue(componentProps: SliderValue.Props) {
  const ctx = useSliderRootContext();

  const thumbMap = computed(() => ctx.value.thumbMap);
  const state = computed(() => ctx.value.state);
  const values = computed(() => ctx.value.values);
  const format = computed(() => ctx.value.format);
  const locale = computed(() => ctx.value.locale);

  const outputFor = computed(
    () =>
      Array.from(thumbMap.value.values(), ({ inputId }) => inputId)
        .join(' ')
        .trim() || undefined,
  );

  const formattedValues = computed(() =>
    values.value.map((v) => formatNumber(v, locale.value, format.value)),
  );

  const defaultDisplayValue = computed(() => formattedValues.value.join(' – '));

  const getElementProps = () => {
    const {
      'aria-live': _ariaLive,
      render: _render,
      className: _className,
      children: _children,
      style: _style,
      ...elementProps
    } = componentProps;
    return elementProps;
  };

  const getElement = useRenderElement('output', componentProps, {
    state,
    ref: componentProps.ref,
    props: [
      () => ({
        // off by default because it will keep announcing when the slider is being dragged
        // and also when the value is changing (but not yet committed)
        'aria-live': componentProps['aria-live'] ?? 'off',
        children:
          typeof componentProps.children === 'function'
            ? componentProps.children(formattedValues.value, values.value)
            : defaultDisplayValue.value,
        // ActView renders native DOM attributes, so the `for` attribute is used directly
        // (React's `htmlFor` alias maps to the same attribute).
        for: outputFor.value,
      }),
      getElementProps,
    ],
    stateAttributesMapping: sliderStateAttributesMapping,
  });

  return getElement();
}

export interface SliderValueState extends SliderRootState {}

export interface SliderValueProps extends Omit<
  BaseUIComponentProps<'output', SliderValueState>,
  'children'
> {
  children?:
    | null
    | ((formattedValues: readonly string[], values: readonly number[]) => VNodeChild)
    | undefined;
}

export namespace SliderValue {
  export type State = SliderValueState;
  export type Props = SliderValueProps;
}
