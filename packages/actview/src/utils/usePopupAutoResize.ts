import { ref, unref, watch } from 'actview';
import type { Ref } from '@actview/core';
import { useAnimationFrame } from '@base-ui/actview-utils/useAnimationFrame';
import { NOOP, EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import type { Dimensions } from '@floating-ui/dom';
import { useAnimationsFinished } from '../internals/useAnimationsFinished';
import { getCssDimensions } from './getCssDimensions';

type MaybeRef<T> = T | Ref<T>;

export type Side = 'top' | 'bottom' | 'left' | 'right' | 'inline-end' | 'inline-start';

/**
 * Allows the element to automatically resize based on its content while supporting animations.
 */
export function usePopupAutoResize(parameters: UsePopupAutoResizeParameters) {
  const {
    popupElement,
    positionerElement,
    content,
    mounted,
    onMeasureLayout: onMeasureLayoutParam,
    onMeasureLayoutComplete: onMeasureLayoutCompleteParam,
    side,
    direction,
  } = parameters;

  const runOnceAnimationsFinish = useAnimationsFinished(
    { get current() { return unref(popupElement); } },
    true,
  );

  const animationFrame = useAnimationFrame();

  const committedDimensions = ref<Dimensions | null>(null);
  const isInitialRender = ref(true);
  const restoreAnchoringStyles = ref<() => void>(NOOP);

  watch(
    [
      () => unref(mounted),
      () => unref(popupElement),
      () => unref(positionerElement),
      () => unref(side),
      () => unref(direction),
      () => unref(content),
    ],
    ([isMounted, popupEl, positionerEl, sideValue, directionValue], _old, onCleanup) => {
      // Reset the state when the popup is closed.
      if (!isMounted) {
        restoreAnchoringStyles.value = NOOP;
        isInitialRender.value = true;
        committedDimensions.value = null;
        return;
      }

      if (!popupEl || !positionerEl) {
        return;
      }

      const anchoringStyles = getPopupAnchoringStyles(sideValue, directionValue);

      restoreAnchoringStyles.value = applyElementStyles(
        popupEl,
        anchoringStyles as Record<string, string>,
      );

      // Measure the rendered size to enable transitions:
      setPopupCssSize(popupEl, 'auto');

      const restorePopupPosition = overrideElementStyle(popupEl, 'position', 'static');
      const restorePopupTransform = overrideElementStyle(popupEl, 'transform', 'none');
      const restorePopupScale = overrideElementStyle(popupEl, 'scale', '1');
      const restorePositionerAvailableSize = applyElementStyles(positionerEl, {
        '--available-width': 'max-content',
        '--available-height': 'max-content',
      });

      function restoreMeasurementOverrides() {
        restorePopupPosition();
        restorePopupTransform();
        restorePositionerAvailableSize();
      }

      function restoreMeasurementOverridesIncludingScale() {
        restoreMeasurementOverrides();
        restorePopupScale();
      }

      onMeasureLayoutParam?.();

      // Initial render (for each time the popup opens).
      if (isInitialRender.value || committedDimensions.value === null) {
        setPositionerCssSize(positionerEl, 'max-content');

        const dimensions = getCssDimensions(popupEl);

        committedDimensions.value = dimensions;

        setPositionerCssSize(positionerEl, dimensions);
        restoreMeasurementOverridesIncludingScale();
        onMeasureLayoutCompleteParam?.(null, dimensions);

        isInitialRender.value = false;

        onCleanup(() => {
          restoreAnchoringStyles.value();
          restoreAnchoringStyles.value = NOOP;
        });
        return;
      }

      // Subsequent renders while open (when `content` changes).
      setPositionerCssSize(positionerEl, 'max-content');

      const previousDimensions = committedDimensions.value;
      const newDimensions = getCssDimensions(popupEl);

      // Commit immediately so future content changes have a stable previous size.
      committedDimensions.value = newDimensions;

      setPopupCssSize(popupEl, previousDimensions);
      restoreMeasurementOverridesIncludingScale();
      onMeasureLayoutCompleteParam?.(previousDimensions, newDimensions);

      setPositionerCssSize(positionerEl, newDimensions);

      const abortController = new AbortController();

      animationFrame.request(() => {
        setPopupCssSize(popupEl, newDimensions);

        runOnceAnimationsFinish(() => {
          popupEl.style.setProperty('--popup-width', 'auto');
          popupEl.style.setProperty('--popup-height', 'auto');
        }, abortController.signal);
      });

      onCleanup(() => {
        abortController.abort();
        animationFrame.cancel();
        restoreAnchoringStyles.value();
        restoreAnchoringStyles.value = NOOP;
      });
    },
    { flush: 'post' },
  );
}

interface UsePopupAutoResizeParameters {
  /**
   * Element to resize.
   */
  popupElement: MaybeRef<HTMLElement | null>;
  /*
   * Positioner element (parent of the popup)
   */
  positionerElement: MaybeRef<HTMLElement | null>;
  /**
   * Whether the popup is mounted.
   */
  mounted: MaybeRef<boolean>;
  /*
   * Content that may change and trigger a resize.
   * This doesn't have to be the actual content of the popup, but a value that triggers a resize.
   */
  content: MaybeRef<unknown>;
  /**
   * Callback fired immediately before measuring the dimensions of the new content.
   */
  onMeasureLayout?: (() => void) | undefined;
  /**
   * Callback fired after the new dimensions have been measured.
   *
   * @param previousDimensions Dimensions before the change, or `null` if this is the first measurement.
   * @param newDimensions Newly measured dimensions.
   */
  onMeasureLayoutComplete?:
    | ((previousDimensions: Dimensions | null, newDimensions: Dimensions) => void)
    | undefined;

  side: MaybeRef<Side>;
  direction: MaybeRef<'ltr' | 'rtl'>;
}

function getPopupAnchoringStyles(
  side: Side,
  direction: 'ltr' | 'rtl',
): Record<string, string | number> {
  // Ensure popup size transitions correctly when anchored to `bottom` (side=top) or `right` (side=left).
  const isPhysicalTop = side === 'top';
  const isPhysicalLeft =
    side === 'left' || side === (direction === 'rtl' ? 'inline-end' : 'inline-start');

  if (!isPhysicalTop && !isPhysicalLeft) {
    return EMPTY_OBJECT as Record<string, string | number>;
  }

  return {
    position: 'absolute',
    [isPhysicalTop ? 'bottom' : 'top']: '0',
    [isPhysicalLeft ? 'right' : 'left']: '0',
  };
}

function overrideElementStyle(element: HTMLElement, property: string, value: string) {
  const originalValue = element.style.getPropertyValue(property);
  element.style.setProperty(property, value);

  return () => {
    element.style.setProperty(property, originalValue);
  };
}

function applyElementStyles(element: HTMLElement, styles: Record<string, string>) {
  const restorers: Array<() => void> = [];

  for (const [key, value] of Object.entries(styles)) {
    restorers.push(overrideElementStyle(element, key, value));
  }

  return restorers.length
    ? () => {
        restorers.forEach((restore) => restore());
      }
    : NOOP;
}

function setPopupCssSize(popupElement: HTMLElement, size: Dimensions | 'auto') {
  const width = size === 'auto' ? 'auto' : `${size.width}px`;
  const height = size === 'auto' ? 'auto' : `${size.height}px`;
  popupElement.style.setProperty('--popup-width', width);
  popupElement.style.setProperty('--popup-height', height);
}

function setPositionerCssSize(positionerElement: HTMLElement, size: Dimensions | 'max-content') {
  const width = size === 'max-content' ? 'max-content' : `${size.width}px`;
  const height = size === 'max-content' ? 'max-content' : `${size.height}px`;
  positionerElement.style.setProperty('--positioner-width', width);
  positionerElement.style.setProperty('--positioner-height', height);
}
