import { computed, onMounted, onUnmounted, ref, toValue, watch } from 'actview';
import type { ComputedRef, Ref } from '@actview/core';
import { addEventListener } from '@base-ui/actview-utils/addEventListener';
import { useMergedRefs } from '@base-ui/actview-utils/useMergedRefs';
import { AnimationFrame } from '@base-ui/actview-utils/useAnimationFrame';
import { useValueAsRef } from '@base-ui/actview-utils/useValueAsRef';
import { warn } from '@base-ui/actview-utils/warn';
import { ownerWindow } from '@base-ui/actview-utils/owner';
import { HTMLProps, RefValue } from '@/internals/types';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { useAnimationsFinished } from '@/internals/useAnimationsFinished';
import { CollapsiblePanelDataAttributes } from '@/collapsible/panel/CollapsiblePanelDataAttributes';
import type { CollapsibleRoot } from '@/collapsible/root/CollapsibleRoot';
import type { TransitionStatus } from '@/internals/useTransitionStatus';

type MaybeRefOrGetter<T> = T | Ref<T> | (() => T);

type AnimationType = 'css-transition' | 'css-animation' | 'none';

interface Dimensions {
  height: number | undefined;
  width: number | undefined;
}

const EMPTY_DIMENSIONS: Dimensions = {
  height: undefined,
  width: undefined,
};

export function useCollapsiblePanel(
  parameters: UseCollapsiblePanelParameters,
): UseCollapsiblePanelReturnValue {
  const { externalRef, onOpenChange, setMounted, setOpen } = parameters;

  const panelRef = { current: null as HTMLDivElement | null };
  const animationTypeRef = { current: null as AnimationType | null };
  const dimensions = ref<Dimensions>(EMPTY_DIMENSIONS);
  const lastMeasuredDimensionsRef = { current: EMPTY_DIMENSIONS as Dimensions };
  // `beforematch` should reveal the matched content immediately, so the next
  // open cycle skips author-defined motion once and then returns to normal.
  const shouldSkipNextOpenRef = { current: false };
  // Keyframe mount animations on initially open panels cause a visible layout
  // shift during the server-rendered first paint, so suppress that first open
  // lifecycle until the panel has been closed once.
  const shouldPreventMountAnimationRef = { current: toValue(parameters.open) };
  // React.Activity tears down Effects while preserving state, so revealing an
  // already-open panel would otherwise replay its CSS keyframe open animation.
  const shouldPreventActivityResumeAnimationRef = { current: false };
  // Some open paths intentionally bypass motion, but the shared root transition
  // status still advances asynchronously. Override the panel to idle so its data
  // attributes and dimension cleanup reflect the immediate open state.
  const forcePanelIdle = ref(false);
  const pendingTemporaryStyleRestoreRef = { current: null as (() => void) | null };

  const mergedPanelRef = useMergedRefs(externalRef, panelRef);
  const latestOpenRef = useValueAsRef(computed(() => toValue(parameters.open)));
  // Only used to handle panel close
  const runOnceCloseAnimationsFinish = useAnimationsFinished(panelRef);

  const open = computed(() => toValue(parameters.open));
  const mounted = computed(() => toValue(parameters.mounted));
  const transitionStatus = computed(() => toValue(parameters.transitionStatus));
  const hiddenUntilFound = computed(() => toValue(parameters.hiddenUntilFound));
  const keepMounted = computed(() => toValue(parameters.keepMounted));

  const hidden = computed(() => !open.value && !mounted.value);
  const panelTransitionStatus = computed<TransitionStatus>(() =>
    forcePanelIdle.value ? 'idle' : transitionStatus.value,
  );
  const shouldPreventOpenAnimation = computed(
    () =>
      open.value &&
      // These 2 refs are only written from committed layout/effect paths and gate
      // one-shot motion suppression for the next open lifecycle.
      (shouldPreventMountAnimationRef.current || shouldPreventActivityResumeAnimationRef.current),
  );
  const renderedDimensions = computed<Dimensions>(() => {
    if (
      !open.value &&
      mounted.value &&
      // These 2 refs hold the last committed animation mode and measurement. This
      // fallback only restores a previously measured pixel size after the live
      // dimensions state has been reset back to `auto`.
      animationTypeRef.current === 'css-animation' &&
      dimensions.value.height === undefined &&
      dimensions.value.width === undefined
    ) {
      return lastMeasuredDimensionsRef.current;
    }

    return dimensions.value;
  });
  const shouldPersistHiddenTransitionStyles = computed(
    () => hiddenUntilFound.value && hidden.value && animationTypeRef.current !== 'css-animation',
  );

  // Most measured dimensions are reused later when CSS keyframe closes need a
  // pixel size after the rendered dimensions have been reset back to `auto`.
  // Passing `false` is only for clearing the current dimensions state.
  const setDimensions = (nextDimensions: Dimensions, shouldCacheMeasurement: boolean = true) => {
    if (shouldCacheMeasurement) {
      lastMeasuredDimensionsRef.current = nextDimensions;
    }

    dimensions.value = nextDimensions;
  };

  const restorePendingTemporaryStyle = () => {
    pendingTemporaryStyleRestoreRef.current?.();
    pendingTemporaryStyleRestoreRef.current = null;
  };

  const setPendingTemporaryStyleRestore = (restore: () => void) => {
    restorePendingTemporaryStyle();
    pendingTemporaryStyleRestoreRef.current = () => {
      pendingTemporaryStyleRestoreRef.current = null;
      restore();
    };
  };

  // React.Activity unmounts Effects while preserving component state. If that
  // teardown happens while an already-open keyframe panel is visible, remember
  // to suppress the replayed open animation on the next committed reveal.
  const markActivityResumeAnimationSuppressed = () => {
    if (open.value && mounted.value && animationTypeRef.current === 'css-animation') {
      shouldPreventActivityResumeAnimationRef.current = true;
    }
  };

  // `forcePanelIdle` is only a temporary override for open paths that skip motion.
  // Keep it active while the shared root still reports `starting`, then drop it
  // once the root transition state catches up.
  watch([forcePanelIdle, transitionStatus], ([isForceIdle, status]) => {
    if (!isForceIdle || status === 'starting') {
      return;
    }

    forcePanelIdle.value = false;
  });

  onUnmounted(() => {
    markActivityResumeAnimationSuppressed();
    restorePendingTemporaryStyle();
  });

  // The core measurement/animation-sequencing effect. It must run after the DOM is
  // mounted (to measure the panel) and again whenever the open/mount/transition
  // state changes, which mirrors React's `useLayoutEffect` dependency behavior.
  useLayoutEffectWatch(
    [mounted, open, transitionStatus, shouldPreventOpenAnimation],
    ([isMounted, isOpen, status, preventOpenAnimation]) => {
      const panel = panelRef.current;
      if (!panel) {
        return undefined;
      }

      // `beforematch` can temporarily force a `0s` motion duration so the matched
      // content reveals immediately. Restore the authored duration before detecting
      // the next close animation type, otherwise that first close is misread as
      // "no motion" and the close transition or keyframe gets skipped.
      if (!isOpen && pendingTemporaryStyleRestoreRef.current) {
        restorePendingTemporaryStyle();
      }

      const animationType = getAnimationType(panel, preventOpenAnimation);
      animationTypeRef.current = animationType;

      // Initially open keyframe panels skip their first paint animation to avoid
      // layout shift, but we still need to cache the expanded size so the first
      // close animation can start from pixels instead of `auto`.
      if (
        isOpen &&
        status === 'idle' &&
        shouldPreventMountAnimationRef.current &&
        animationType === 'css-animation'
      ) {
        lastMeasuredDimensionsRef.current = getDimensions(panel);
        return undefined;
      }

      // Handle the opening pass: measure the expanded size and, when necessary,
      // neutralize author-defined motion so the panel can open immediately.
      if (isOpen && status === 'starting') {
        // `beforematch` opens should reveal the panel immediately so find-in-page
        // does not wait for the author-defined transition or animation to finish.
        const skipNextOpen = shouldSkipNextOpenRef.current;
        shouldSkipNextOpenRef.current = false;

        if (animationType === 'none') {
          setDimensions(getDimensions(panel));
          forcePanelIdle.value = true;
          return undefined;
        }

        if (animationType === 'css-transition') {
          const restoreLayoutStyles = resetLayoutStyles(panel);
          setDimensions(getDimensions(panel));

          if (!skipNextOpen) {
            return restoreLayoutStyles;
          }

          const restoreTransitionDuration = setTemporaryStyle(panel, 'transition-duration', '0s');
          setPendingTemporaryStyleRestore(restoreTransitionDuration);
          forcePanelIdle.value = true;
          return restoreLayoutStyles;
        }

        setDimensions(getDimensions(panel));

        const restoreAnimationName = setTemporaryStyle(panel, 'animation-name', 'none');
        if (!skipNextOpen) {
          restoreAnimationName();
          return undefined;
        }

        const restoreAnimationDuration = setTemporaryStyle(panel, 'animation-duration', '0s');

        restoreAnimationName();
        setPendingTemporaryStyleRestore(restoreAnimationDuration);
        forcePanelIdle.value = true;

        return undefined;
      }

      // Capture the current size as soon as close is requested, before the
      // deferred ending phase applies closed styles. This keeps close transitions
      // starting from a measured pixel value, including interrupted opens.
      if (!isOpen && isMounted && (status === 'idle' || status === 'starting')) {
        shouldPreventMountAnimationRef.current = false;
        shouldPreventActivityResumeAnimationRef.current = false;

        if (animationType === 'none') {
          setDimensions(EMPTY_DIMENSIONS, false);
          setMounted(false);
          return undefined;
        }

        setDimensions(getDimensions(panel));
        return undefined;
      }

      if (status !== 'ending') {
        return undefined;
      }

      // Reachable when `transitionStatus` already flipped to `ending` before this
      // effect ran, so the close branch above was skipped. Without motion there is
      // nothing to wait for, so unmount here instead of deferring to the
      // animation-finished path below.
      if (animationType === 'none') {
        setMounted(false);
        return undefined;
      }

      const nextDimensions = getDimensions(panel);
      const hasMeasuredSize = nextDimensions.height > 0 || nextDimensions.width > 0;

      if (!hasMeasuredSize) {
        setMounted(false);
        return undefined;
      }

      setDimensions(nextDimensions);

      if (animationType === 'css-animation') {
        const restoreAnimationName = setTemporaryStyle(panel, 'animation-name', 'none');
        restoreAnimationName();
      }

      return undefined;
    },
  );

  useOpenChangeComplete({
    enabled: computed(() => open.value && mounted.value && panelTransitionStatus.value === 'idle'),
    open: true,
    ref: panelRef,
    onComplete() {
      // The open animation's `finished` microtask can resolve after the render that
      // set `open` to `false` but before the effect cleanup, so re-check the latest
      // value here. Clearing the measured size in that window would make the close
      // transition start from `height: 0` instead of the expanded pixel height.
      if (!open.value) {
        return;
      }

      setDimensions(EMPTY_DIMENSIONS, false);
    },
  });

  // Closing panels need extra sequencing beyond `useOpenChangeComplete`.
  // Chrome can still register the exit transition one frame later when an
  // Accordion closes one item while opening another, so wait one frame before
  // watching animations. See https://github.com/mui/base-ui/issues/3099
  let closeAnimationCleanup: (() => void) | null = null;
  onUnmounted(() => {
    closeAnimationCleanup?.();
    closeAnimationCleanup = null;
  });
  watch(
    [open, mounted, panelTransitionStatus],
    ([isOpen, isMounted, status]) => {
      closeAnimationCleanup?.();
      closeAnimationCleanup = null;

      if (isOpen || !isMounted || status !== 'ending') {
        return;
      }

      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      const abortController = new AbortController();
      let endingStyleFrame = -1;

      function handleComplete() {
        // `open` is captured by this effect's closure and always `false` here, so
        // read the latest value from a ref. Unmounting a panel that has already
        // reopened would drop it from the DOM.
        if (latestOpenRef.current) {
          return;
        }

        setMounted(false);
        setDimensions(EMPTY_DIMENSIONS, false);
      }

      endingStyleFrame = AnimationFrame.request(() => {
        runOnceCloseAnimationsFinish(handleComplete, abortController.signal);
      });

      closeAnimationCleanup = () => {
        AnimationFrame.cancel(endingStyleFrame);
        abortController.abort();
      };
    },
    { flush: 'post' },
  );

  // React only supports a boolean for the `hidden` attribute and forces legit
  // string values to booleans, so we have to force it back in the DOM when
  // necessary: https://github.com/react/react/issues/24740
  useLayoutEffectWatch([hidden, hiddenUntilFound], ([isHidden, isHiddenUntilFound]) => {
    const panel = panelRef.current;

    if (!panel || !isHiddenUntilFound || !isHidden) {
      return undefined;
    }

    panel.setAttribute('hidden', 'until-found');
    return undefined;
  });

  const handleBeforeMatch = (event: Event) => {
    const eventDetails = createChangeEventDetails(REASONS.none, event);

    onOpenChange(true, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    shouldSkipNextOpenRef.current = true;
    setOpen(true);
  };

  const shouldRender = computed(
    () => keepMounted.value || hiddenUntilFound.value || mounted.value || open.value,
  );

  useLayoutEffectWatch([shouldRender], ([isRendered]) => {
    if (!isRendered) {
      return undefined;
    }

    const panel = panelRef.current;
    if (!panel) {
      return undefined;
    }

    return addEventListener(panel, 'beforematch', handleBeforeMatch);
  });

  const getPanelProps = (): HTMLProps => ({
    ...(shouldPersistHiddenTransitionStyles.value
      ? { [CollapsiblePanelDataAttributes.startingStyle]: '' }
      : undefined),
    hidden: hidden.value,
    id: toValue(parameters.id),
  });

  return {
    height: computed(() => renderedDimensions.value.height),
    props: getPanelProps,
    ref: mergedPanelRef as (node: HTMLDivElement | null) => void,
    shouldPreventOpenAnimation,
    shouldRender,
    transitionStatus: panelTransitionStatus,
    width: computed(() => renderedDimensions.value.width),
  };
}

/**
 * Runs an effect after the DOM is mounted and again whenever any watched source
 * changes, running the previous cleanup before each re-run and on unmount. This
 * mirrors React's `useLayoutEffect` with a dependency list (ActView has no layout
 * phase, so effects run post-flush).
 */
function useLayoutEffectWatch(
  sources: Array<Ref<any> | ComputedRef<any> | (() => any)>,
  callback: (values: any[]) => void | (() => void),
): void {
  const postMountTick = ref(0);
  let cleanup: (() => void) | null = null;

  onMounted(() => {
    postMountTick.value += 1;
  });

  onUnmounted(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  });

  watch(
    [...sources, postMountTick],
    (values) => {
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
      const result = callback(values);
      cleanup = typeof result === 'function' ? result : null;
    },
    { flush: 'post' },
  );
}

function getDimensions(element: HTMLElement) {
  return {
    height: element.scrollHeight,
    width: element.scrollWidth,
  };
}

function getAnimationType(
  element: HTMLElement,
  hasSuppressedMountAnimation: boolean,
): AnimationType {
  const panelStyles = ownerWindow(element).getComputedStyle(element);
  const hasAnimation =
    (panelStyles.animationName
      .split(',')
      .map((name) => name.trim())
      .some((name) => name !== '' && name !== 'none') ||
      hasSuppressedMountAnimation) &&
    hasNonZeroDuration(panelStyles.animationDuration);
  const hasTransition = hasNonZeroDuration(panelStyles.transitionDuration);

  if (hasAnimation && hasTransition) {
    /* istanbul ignore else -- `process.env.NODE_ENV` is a build-time constant under test */
    if (process.env.NODE_ENV !== 'production') {
      warn(
        'CSS transitions and CSS animations both detected on Collapsible or Accordion panel.',
        'Only one of either animation type should be used.',
      );
    }

    return 'css-transition';
  }

  if (hasTransition) {
    return 'css-transition';
  }

  if (hasAnimation) {
    return 'css-animation';
  }

  return 'none';
}

function hasNonZeroDuration(value: string) {
  return value
    .split(',')
    .map((part) => part.trim())
    .some((part) => part !== '' && Number.parseFloat(part) > 0);
}

/**
 * Temporarily overrides an inline style property and returns a cleanup that
 * restores the previous inline value and priority.
 * @param element - The element whose inline style should be updated.
 * @param property - The CSS property name to override.
 * @param value - The temporary value to assign.
 * @returns A cleanup function that restores the original inline style state.
 */
function setTemporaryStyle(element: HTMLElement, property: string, value: string): () => void {
  const previousValue = element.style.getPropertyValue(property);
  const previousPriority = element.style.getPropertyPriority(property);

  element.style.setProperty(property, value);

  return () => {
    if (previousValue === '') {
      element.style.removeProperty(property);
      return;
    }

    element.style.setProperty(property, previousValue, previousPriority);
  };
}

/**
 * Temporarily resets inline alignment styles that can distort scroll-based
 * size measurements, then restores them on the next animation frame.
 * @param element - The panel element being measured.
 * @returns A cleanup function that cancels the scheduled restore and reapplies
 * the original inline layout styles immediately.
 */
function resetLayoutStyles(element: HTMLElement): () => void {
  const originalLayoutStyles = {
    'justify-content': element.style.justifyContent,
    'align-items': element.style.alignItems,
    'align-content': element.style.alignContent,
    'justify-items': element.style.justifyItems,
  };

  Object.keys(originalLayoutStyles).forEach((key) => {
    element.style.setProperty(key, 'initial', 'important');
  });

  function restoreLayoutStyles() {
    Object.entries(originalLayoutStyles).forEach(([key, value]) => {
      if (value === '') {
        element.style.removeProperty(key);
        return;
      }

      element.style.setProperty(key, value);
    });
  }

  const frame = AnimationFrame.request(restoreLayoutStyles);

  return () => {
    AnimationFrame.cancel(frame);
    restoreLayoutStyles();
  };
}

export interface UseCollapsiblePanelParameters {
  externalRef: RefValue<HTMLDivElement>;
  /**
   * Allows the browser's built-in page search to find and expand the panel contents.
   *
   * Overrides the `keepMounted` prop and uses `hidden="until-found"`
   * to hide the element without removing it from the DOM.
   */
  hiddenUntilFound: MaybeRefOrGetter<boolean>;
  /**
   * The `id` attribute of the panel.
   */
  id: MaybeRefOrGetter<string | undefined>;
  /**
   * Whether to keep the element in the DOM while the panel is closed.
   * This prop is ignored when `hiddenUntilFound` is used.
   */
  keepMounted: MaybeRefOrGetter<boolean>;
  /**
   * Whether the collapsible panel is mounted for transition and hidden-state
   * purposes. This can be `false` while the element remains in the DOM when
   * `keepMounted` or `hiddenUntilFound` is enabled.
   */
  mounted: MaybeRefOrGetter<boolean>;
  onOpenChange: (open: boolean, eventDetails: CollapsibleRoot.ChangeEventDetails) => void;
  /**
   * Whether the collapsible panel is currently open.
   */
  open: MaybeRefOrGetter<boolean>;
  setMounted: (nextMounted: boolean) => void;
  setOpen: (nextOpen: boolean) => void;
  transitionStatus: MaybeRefOrGetter<TransitionStatus>;
}

export interface UseCollapsiblePanelReturnValue {
  height: ComputedRef<number | undefined>;
  props: () => HTMLProps;
  ref: (node: HTMLDivElement | null) => void;
  shouldPreventOpenAnimation: ComputedRef<boolean>;
  shouldRender: ComputedRef<boolean>;
  transitionStatus: ComputedRef<TransitionStatus>;
  width: ComputedRef<number | undefined>;
}
