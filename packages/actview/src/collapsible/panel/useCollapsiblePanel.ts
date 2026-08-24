import { computed, onUnmounted, ref, toValue, watch } from 'actview';
import type { ComputedRef, Ref } from 'actview';
import { addEventListener } from '@/utils/addEventListener';
import { AnimationFrame } from '@base-ui/actview-utils/useAnimationFrame';
import type { HTMLProps, MaybeRefOrGetter } from '@/internals/types';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { useAnimationsFinished } from '@/internals/useAnimationsFinished';
import { CollapsiblePanelDataAttributes } from './CollapsiblePanelDataAttributes';
import type { TransitionStatus } from '@/internals/useTransitionStatus';

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
  const {
    externalRef,
    hiddenUntilFound,
    id: idParam,
    keepMounted,
    mounted,
    onOpenChange,
    open,
    setMounted,
    setOpen,
    transitionStatus,
  } = parameters;

  const panelRef = ref<HTMLDivElement | null>(null);
  const animationTypeRef = ref<AnimationType | null>(null);
  const dimensions = ref<Dimensions>(EMPTY_DIMENSIONS);
  const lastMeasuredDimensionsRef = ref<Dimensions>(EMPTY_DIMENSIONS);
  // `beforematch` should reveal the matched content immediately, so the next
  // open cycle skips author-defined motion once and then returns to normal.
  const shouldSkipNextOpenRef = ref(false);
  // Keyframe mount animations on initially open panels cause a visible layout
  // shift during the server-rendered first paint, so suppress that first open
  // lifecycle until the panel has been closed once.
  const shouldPreventMountAnimationRef = ref(Boolean(toValue(open)));
  // React.Activity tears down Effects while preserving state, so revealing an
  // already-open panel would otherwise replay its CSS keyframe open animation.
  const shouldPreventActivityResumeAnimationRef = ref(false);
  // Some open paths intentionally bypass motion, but the shared root transition
  // status still advances asynchronously. Override the panel to idle so its data
  // attributes and dimension cleanup reflect the immediate open state.
  const forcePanelIdle = ref(false);
  const pendingTemporaryStyleRestoreRef = ref<(() => void) | null>(null);

  const setPanelRef = (element: HTMLDivElement | null) => {
    panelRef.value = element;
    if (typeof externalRef === 'function') {
      externalRef(element);
    } else if (externalRef) {
      (externalRef as {value: HTMLDivElement | null}).value = element;
    }
  };

  // React useValueAsRef(open)：latestOpen.value 始终是最新 open（避免
  // 异步回调读到旧闭包值）
  const latestOpen = ref(toValue(open) ?? false);
  watch(
    () => toValue(open),
    (v) => {
      latestOpen.value = v ?? false;
    },
  );

  // Only used to handle panel close
  const runOnceCloseAnimationsFinish = useAnimationsFinished(panelRef);

  const openValue = () => toValue(open) ?? false;
  const mountedValue = () => toValue(mounted);
  const hiddenUntilFoundValue = () => toValue(hiddenUntilFound);
  const keepMountedValue = () => toValue(keepMounted);
  const idValue = () => toValue(idParam);
  const hidden = computed(() => !openValue() && !mountedValue());
  const panelTransitionStatus = computed(() =>
    forcePanelIdle.value ? 'idle' : (toValue(transitionStatus) as TransitionStatus),
  );
  const shouldPreventOpenAnimation = computed(
    () =>
      openValue() &&
      // These 2 refs are safe to read in render, they are only written from committed
      // layout/effect paths and gate one-shot motion suppression for the next open
      // lifecycle. They intentionally expose the last committed motion snapshot.
      (shouldPreventMountAnimationRef.value || shouldPreventActivityResumeAnimationRef.value),
  );
  const renderedDimensions = computed<Dimensions>(() => {
    if (
      !openValue() &&
      mountedValue() &&
      animationTypeRef.value === 'css-animation' &&
      dimensions.value.height === undefined &&
      dimensions.value.width === undefined
    ) {
      return lastMeasuredDimensionsRef.value;
    }
    return dimensions.value;
  });
  const shouldPersistHiddenTransitionStyles = computed(
    () =>
      hiddenUntilFoundValue() && hidden.value && animationTypeRef.value !== 'css-animation',
  );

  // Most measured dimensions are reused later when CSS keyframe closes need a
  // pixel size after the rendered dimensions have been reset back to `auto`.
  // Passing `false` is only for clearing the current dimensions state.
  const setDimensions = (
    nextDimensions: Dimensions,
    shouldCacheMeasurement: boolean = true,
  ) => {
    if (shouldCacheMeasurement) {
      lastMeasuredDimensionsRef.value = nextDimensions;
    }

    dimensions.value = nextDimensions;
  };

  const restorePendingTemporaryStyle = () => {
    pendingTemporaryStyleRestoreRef.value?.();
    pendingTemporaryStyleRestoreRef.value = null;
  };

  const setPendingTemporaryStyleRestore = (restore: () => void) => {
    restorePendingTemporaryStyle();
    pendingTemporaryStyleRestoreRef.value = () => {
      pendingTemporaryStyleRestoreRef.value = null;
      restore();
    };
  };

  // React.Activity unmounts Effects while preserving component state. If that
  // teardown happens while an already-open keyframe panel is visible, remember
  // to suppress the replayed open animation on the next committed reveal.
  const markActivityResumeAnimationSuppressed = () => {
    if (openValue() && mountedValue() && animationTypeRef.value === 'css-animation') {
      shouldPreventActivityResumeAnimationRef.value = true;
    }
  };

  // `forcePanelIdle` is only a temporary override for open paths that skip
  // motion. Keep it active while the shared root still reports `starting`,
  // then drop it once the root transition state catches up.
  watch(
    () => [forcePanelIdle.value, toValue(transitionStatus)],
    ([forcePanelIdleValue, transitionStatusValue]) => {
      if (!forcePanelIdleValue || transitionStatusValue === 'starting') {
        return;
      }

      forcePanelIdle.value = false;
    },
    {flush: 'post'},
  );

  onUnmounted(() => {
    markActivityResumeAnimationSuppressed();
    restorePendingTemporaryStyle();
  });

  // 主测量 effect（React 版最大的 useIsoLayoutEffect）：open/close 时测量
  // 面板尺寸、中和作者动效、缓存像素尺寸等。
  watch(
    () => [
      mountedValue(),
      openValue(),
      toValue(transitionStatus),
      shouldPreventOpenAnimation.value,
    ],
    () => {
      const panel = panelRef.value;
      if (!panel) {
        return;
      }

      // `beforematch` can temporarily force a `0s` motion duration so the matched
      // content reveals immediately. Restore the authored duration before detecting
      // the next close animation type, otherwise that first close is misread as
      // "no motion" and the close transition or keyframe gets skipped.
      if (!openValue() && pendingTemporaryStyleRestoreRef.value) {
        restorePendingTemporaryStyle();
      }

      const animationType = getAnimationType(panel, shouldPreventOpenAnimation.value);
      animationTypeRef.value = animationType;

      // Initially open keyframe panels skip their first paint animation to avoid
      // layout shift, but we still need to cache the expanded size so the first
      // close animation can start from pixels instead of `auto`.
      if (
        openValue() &&
        toValue(transitionStatus) === 'idle' &&
        shouldPreventMountAnimationRef.value &&
        animationType === 'css-animation'
      ) {
        lastMeasuredDimensionsRef.value = getDimensions(panel);
        return;
      }

      // Handle the opening pass: measure the expanded size and, when necessary,
      // neutralize author-defined motion so the panel can open immediately.
      if (openValue() && toValue(transitionStatus) === 'starting') {
        // `beforematch` opens should reveal the panel immediately so find-in-page
        // does not wait for the author-defined transition or animation to finish.
        const skipNextOpen = shouldSkipNextOpenRef.value;
        shouldSkipNextOpenRef.value = false;

        if (animationType === 'none') {
          setDimensions(getDimensions(panel));
          forcePanelIdle.value = true;
          return;
        }

        if (animationType === 'css-transition') {
          const restoreLayoutStyles = resetLayoutStyles(panel);
          setDimensions(getDimensions(panel));

          if (!skipNextOpen) {
            return;
          }

          const restoreTransitionDuration = setTemporaryStyle(panel, 'transition-duration', '0s');
          setPendingTemporaryStyleRestore(restoreTransitionDuration);
          forcePanelIdle.value = true;
          return;
        }

        setDimensions(getDimensions(panel));

        const restoreAnimationName = setTemporaryStyle(panel, 'animation-name', 'none');
        if (!skipNextOpen) {
          restoreAnimationName();
          return;
        }

        const restoreAnimationDuration = setTemporaryStyle(panel, 'animation-duration', '0s');

        restoreAnimationName();
        setPendingTemporaryStyleRestore(restoreAnimationDuration);
        forcePanelIdle.value = true;

        return;
      }

      // Capture the current size as soon as close is requested, before the
      // deferred ending phase applies closed styles. This keeps close transitions
      // starting from a measured pixel value, including interrupted opens.
      if (
        !openValue() &&
        mountedValue() &&
        (toValue(transitionStatus) === 'idle' || toValue(transitionStatus) === 'starting')
      ) {
        shouldPreventMountAnimationRef.value = false;
        shouldPreventActivityResumeAnimationRef.value = false;

        if (animationType === 'none') {
          setDimensions(EMPTY_DIMENSIONS, false);
          setMounted(false);
          return;
        }

        setDimensions(getDimensions(panel));
        return;
      }

      if (toValue(transitionStatus) !== 'ending') {
        return;
      }

      // Reachable when `transitionStatus` already flipped to `ending` before this effect ran, so
      // the close branch above was skipped. Without motion there is nothing to wait for, so unmount
      // here instead of deferring to the animation-finished path below.
      if (animationType === 'none') {
        setMounted(false);
        return;
      }

      const nextDimensions = getDimensions(panel);
      const hasMeasuredSize = nextDimensions.height > 0 || nextDimensions.width > 0;

      if (!hasMeasuredSize) {
        setMounted(false);
        return;
      }

      setDimensions(nextDimensions);

      if (animationType === 'css-animation') {
        const restoreAnimationName = setTemporaryStyle(panel, 'animation-name', 'none');
        restoreAnimationName();
      }
    },
    {flush: 'post'},
  );

  useOpenChangeComplete({
    enabled: () => openValue() && mountedValue() && panelTransitionStatus.value === 'idle',
    open: true,
    ref: panelRef,
    onComplete() {
      // `useOpenChangeComplete` only aborts from its effect cleanup, which React runs in the
      // post-paint passive flush. An animation's `finished` microtask can resolve after the render
      // that set `open` to `false` but before that cleanup, so re-check the latest value here.
      // Clearing the measured size in that window would make the close transition start from
      // `height: 0` instead of the expanded pixel height.
      if (!openValue()) {
        return;
      }

      setDimensions(EMPTY_DIMENSIONS, false);
    },
  });

  // Closing panels need extra sequencing beyond `useOpenChangeComplete`.
  // This passive effect runs after the `ending` render has committed, so
  // `[data-ending-style]` is already present. Chrome can still register the
  // exit transition one frame later when an Accordion closes one item while
  // opening another, so wait one frame before watching animations.
  // See https://github.com/mui/base-ui/issues/3099
  watch(
    () => [openValue(), mountedValue(), panelTransitionStatus.value],
    ([openValueResult, mountedValueResult, panelTransitionStatusResult], _old, onCleanup) => {
      if (openValueResult || !mountedValueResult || panelTransitionStatusResult !== 'ending') {
        return;
      }

      const panel = panelRef.value;
      if (!panel) {
        return;
      }

      const abortController = new AbortController();
      let endingStyleFrame = -1;

      function handleComplete() {
        // Same post-paint race as the `useOpenChangeComplete` callback above, except `open` is
        // captured by this effect's closure and always `false` here, so read the latest value from
        // a ref. Unmounting a panel that has already reopened would drop it from the DOM.
        if (latestOpen.value) {
          return;
        }

        setMounted(false);
        setDimensions(EMPTY_DIMENSIONS, false);
      }

      endingStyleFrame = AnimationFrame.request(() => {
        runOnceCloseAnimationsFinish(handleComplete, abortController.signal);
      });

      onCleanup(() => {
        AnimationFrame.cancel(endingStyleFrame);
        abortController.abort();
      });
    },
    {flush: 'post'},
  );

  // React only supports a boolean for the `hidden` attribute and forces
  // legit string values to booleans so we have to force it back in the DOM
  // when necessary: https://github.com/react/react/issues/24740
  watch(
    () => [panelRef.value, hiddenUntilFoundValue(), hidden.value],
    ([panel, hiddenUntilFoundValueResult, hiddenValue]) => {
      if (!panel || !hiddenUntilFoundValueResult || !hiddenValue) {
        return;
      }

      panel.setAttribute('hidden', 'until-found');
    },
    {flush: 'post', immediate: true},
  );

  watch(
    () => panelRef.value,
    (panel, _old, onCleanup) => {
      if (!panel) {
        return;
      }

      function handleBeforeMatch(event: Event) {
        const eventDetails = createChangeEventDetails(REASONS.none, event);

        onOpenChange(true, eventDetails);

        if (eventDetails.isCanceled) {
          return;
        }

        shouldSkipNextOpenRef.value = true;
        setOpen(true);
      }

      const remove = addEventListener(panel, 'beforematch', handleBeforeMatch);
      onCleanup(() => remove());
    },
  );

  const shouldRender = computed(
    () => keepMountedValue() || hiddenUntilFoundValue() || mountedValue() || openValue(),
  );

  const getPanelProps = (): HTMLProps => ({
    ...(shouldPersistHiddenTransitionStyles.value
      ? {[CollapsiblePanelDataAttributes.startingStyle]: ''}
      : undefined),
    // React 只支持 boolean hidden 属性，hiddenUntilFound 时靠 effect 强制
    // setAttribute('until-found')；actview 渲染直接输出字符串值（渲染期读
    // hiddenUntilFoundValue 保持响应），避免 setAttribute 被后续渲染覆盖。
    hidden: (hidden.value ? (hiddenUntilFoundValue() ? 'until-found' : '') : undefined) as any,
    id: idValue(),
  });

  return {
    height: computed(() => renderedDimensions.value.height),
    props: getPanelProps,
    ref: setPanelRef,
    shouldPreventOpenAnimation,
    shouldRender,
    transitionStatus: panelTransitionStatus,
    width: computed(() => renderedDimensions.value.width),
  };
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
      console.warn(
        'Base UI: CSS transitions and CSS animations both detected on Collapsible or Accordion panel.\n' +
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

function ownerWindow(node: Node | undefined): Window {
  const doc = (node && node.ownerDocument) || document;
  return doc.defaultView || window;
}

export interface UseCollapsiblePanelParameters {
  externalRef:
    | ((element: HTMLDivElement | null) => void)
    | {value: HTMLDivElement | null}
    | null
    | undefined;
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
  onOpenChange: (open: boolean, eventDetails: any) => void;
  /**
   * Whether the collapsible panel is currently open.
   */
  open: MaybeRefOrGetter<boolean | undefined>;
  setMounted: (nextMounted: boolean) => void;
  setOpen: (nextOpen: boolean) => void;
  transitionStatus: MaybeRefOrGetter<TransitionStatus>;
}

export interface UseCollapsiblePanelReturnValue {
  height: ComputedRef<number | undefined>;
  props: () => HTMLProps;
  ref: (element: HTMLDivElement | null) => void;
  shouldPreventOpenAnimation: ComputedRef<boolean>;
  shouldRender: ComputedRef<boolean>;
  transitionStatus: ComputedRef<TransitionStatus>;
  width: ComputedRef<number | undefined>;
}


