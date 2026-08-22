import { computed } from 'actview';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { valueToPercent } from '@/utils/valueToPercent';
import { useIsHydrating } from '@/utils/useIsHydrating';
import { useRenderElement } from '@/internals/useRenderElement';
import { useSliderRootContext } from '@/slider/root/SliderRootContext';
import { sliderStateAttributesMapping } from '@/slider/root/stateAttributesMapping';
import type { SliderRootState } from '@/slider/root/SliderRoot';

type StyleObject = Record<string, string | number | undefined>;

function getIndicatorStyles(
  vertical: boolean,
  range: boolean,
  inset: boolean,
  start: number | undefined,
  end: number | undefined,
  forceHidden: boolean,
): StyleObject {
  const styles: StyleObject = {
    visibility:
      forceHidden || (inset && (start === undefined || (range && end === undefined)))
        ? 'hidden'
        : undefined,
    position: vertical ? 'absolute' : 'relative',
    [vertical ? 'width' : 'height']: 'inherit',
  };

  let startValue: string = `${start ?? 0}%`;
  let sizeValue: string = `${(end ?? 0) - (start ?? 0)}%`;

  if (inset) {
    styles['--start-position'] = startValue;
    startValue = 'var(--start-position)';

    if (range) {
      styles['--relative-size'] = sizeValue;
      sizeValue = 'var(--relative-size)';
    }
  }

  styles[vertical ? 'bottom' : 'insetInlineStart'] = range ? startValue : 0;
  styles[vertical ? 'height' : 'width'] = range ? sizeValue : startValue;

  return styles;
}

/**
 * Visualizes the current value of the slider.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui.com/react/components/slider)
 */
export function SliderIndicator(componentProps: SliderIndicator.Props) {
  const ctx = useSliderRootContext();

  const indicatorPosition = computed(() => ctx.value.indicatorPosition);
  const inset = computed(() => ctx.value.inset);
  const max = computed(() => ctx.value.max);
  const min = computed(() => ctx.value.min);
  const orientation = computed(() => ctx.value.orientation);
  const renderBeforeHydration = computed(() => ctx.value.renderBeforeHydration);
  const state = computed(() => ctx.value.state);
  const values = computed(() => ctx.value.values);

  const isHydrating = useIsHydrating();

  const vertical = computed(() => orientation.value === 'vertical');
  const range = computed(() => values.value.length > 1);

  const style = computed(() =>
    getIndicatorStyles(
      vertical.value,
      range.value,
      inset.value,
      inset.value
        ? indicatorPosition.value[0]
        : valueToPercent(values.value[0], min.value, max.value),
      inset.value
        ? indicatorPosition.value[1]
        : valueToPercent(values.value[values.value.length - 1], min.value, max.value),
      inset.value && renderBeforeHydration.value && isHydrating,
    ),
  );

  const getElementProps = (prev: HTMLProps): HTMLProps => {
    const {
      render: _render,
      className: _className,
      style: _style,
      ...elementProps
    } = componentProps;
    return { ...prev, ...elementProps };
  };

  const getElement = useRenderElement('div', componentProps, {
    state,
    ref: componentProps.ref,
    props: [
      () => ({
        'data-base-ui-slider-indicator': renderBeforeHydration.value ? '' : undefined,
        style: style.value as Record<string, string | number>,
      }),
      getElementProps,
    ],
    stateAttributesMapping: sliderStateAttributesMapping,
  });

  // Wrap in a Fragment so the ActView Babel transform recognizes this as a JSX
  // return and converts the component to a `{ __setup }` VNode type (AI-003).
  return <>{getElement()}</>;
}

export interface SliderIndicatorState extends SliderRootState {}

export interface SliderIndicatorProps extends BaseUIComponentProps<'div', SliderIndicatorState> {}

export namespace SliderIndicator {
  export type State = SliderIndicatorState;
  export type Props = SliderIndicatorProps;
}
