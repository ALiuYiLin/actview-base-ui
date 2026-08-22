import { computed, watch } from 'actview';
import { addEventListener } from '@base-ui/actview-utils/addEventListener';
import { mergeCleanups } from '@base-ui/actview-utils/mergeCleanups';
import { ownerDocument, ownerWindow } from '@base-ui/actview-utils/owner';
import { visuallyHidden } from '@base-ui/actview-utils/visuallyHidden';
import { useTimeout } from '@base-ui/actview-utils/useTimeout';
import { activeElement, contains, getTarget } from '@/floating-ui-actview/utils';
import { renderFocusGuard } from '@/utils/FocusGuard';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { useToastProviderContext } from '@/toast/provider/ToastProviderContext';
import { useRenderElement } from '@/internals/useRenderElement';
import { isFocusVisible } from '@/toast/utils/focusVisible';

/**
 * A container viewport for toasts.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastViewport(componentProps: ToastViewport.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    ...elementProps
  } = componentProps;

  const store = useToastProviderContext().value!;
  const windowFocusTimeout = useTimeout();

  const handlingFocusGuardRef = { current: false };
  const markedReadyForMouseLeaveRef = { current: false };
  const touchActiveRef = { current: false };

  const isEmpty = store.useState('isEmpty');
  const toasts = store.useState('toasts');
  const focused = store.useState('focused');
  const expanded = store.useState('expanded');
  const prevFocusElement = store.useState('prevFocusElement');
  const frontmostHeight = toasts.value[0]?.height;

  const hasTransitioningToasts = computed(() =>
    toasts.value.some((toast) => toast.transitionStatus === 'ending'),
  );
  const highPriorityToasts = computed(() =>
    toasts.value.filter((toast) => toast.priority === 'high'),
  );

  // `store.state.viewport` isn't available on the first render, since the portal node hasn't yet
  // been created. Depending on `isEmpty` ensures the listeners are attached once toasts exist and
  // the viewport ref is available.
  watch(
    isEmpty,
    (isEmptyValue, _old, onCleanup) => {
      const viewport = store.state.viewport;
      if (!viewport || isEmptyValue) {
        return;
      }

      const win = ownerWindow(viewport);
      const doc = ownerDocument(viewport);

      // Listen globally for F6 so we can force-focus the viewport.
      function handleGlobalKeyDown(event: KeyboardEvent) {
        if (event.key === 'F6' && getTarget(event) !== viewport) {
          event.preventDefault();
          store.set('prevFocusElement', activeElement(doc) as HTMLElement | null);
          viewport?.focus({ preventScroll: true });
          store.pauseTimers();
          store.set('focused', true);
        }
      }

      function handleWindowBlur(event: FocusEvent) {
        if (getTarget(event) !== win) {
          return;
        }

        store.set('isWindowFocused', false);
        store.pauseTimers();
      }

      function handleWindowFocus(event: FocusEvent) {
        if (event.relatedTarget) {
          return;
        }

        const target = getTarget(event);
        const activeEl = activeElement(ownerDocument(viewport));
        if (
          target === win ||
          !contains(viewport, target as HTMLElement | null) ||
          !isFocusVisible(activeEl)
        ) {
          store.resumeTimers();
        }

        // Wait for the `handleFocus` event to fire.
        windowFocusTimeout.start(0, () => store.set('isWindowFocused', true));
      }

      const cleanup = mergeCleanups(
        addEventListener(win, 'keydown', handleGlobalKeyDown),
        addEventListener(win, 'blur', handleWindowBlur, true),
        addEventListener(win, 'focus', handleWindowFocus, true),
        addEventListener(doc, 'pointerdown', store.handleDocumentPointerDown, true),
      );

      onCleanup(() => {
        cleanup();
      });
    },
    { immediate: true },
  );

  function handleFocusGuard(event: FocusEvent) {
    handlingFocusGuardRef.current = true;

    // If we're coming off the container, move to the first toast that can hold
    // focus, skipping toasts that are animating out or inert because they're limited.
    const firstFocusableToast =
      event.relatedTarget === store.state.viewport
        ? toasts.value.find((toast) => toast.transitionStatus !== 'ending' && !toast.limited)
        : undefined;

    if (firstFocusableToast) {
      const ref = firstFocusableToast.ref as
        | { current?: HTMLElement | null; value?: HTMLElement | null }
        | undefined;
      (ref?.current ?? ref?.value)?.focus();
    } else {
      store.restoreFocusToPrevElement();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (
      event.key === 'Tab' &&
      event.shiftKey &&
      getTarget(event) === store.state.viewport
    ) {
      event.preventDefault();
      // Restoring focus blurs the viewport, and `handleBlur` resumes the timers
      // from there. Resuming here as well would also fire when the previously
      // focused element lives inside the viewport, letting toasts dismiss out
      // from under the keyboard.
      store.restoreFocusToPrevElement();
    }
  }

  function flushMouseLeave() {
    const hasEndingToasts = store.state.toasts.some(
      (toast) => toast.transitionStatus === 'ending',
    );

    if (hasEndingToasts || touchActiveRef.current || !markedReadyForMouseLeaveRef.current) {
      return;
    }

    // Once transitions have finished, see if a mouseleave was already triggered
    // but blocked from taking effect. If so, we can now safely collapse the viewport
    // without restarting timers while the window is blurred.
    if (store.state.isWindowFocused) {
      store.resumeTimers();
    }
    store.set('hovering', false);
    markedReadyForMouseLeaveRef.current = false;
  }

  watch(
    hasTransitioningToasts,
    () => {
      flushMouseLeave();
    },
    { immediate: true },
  );

  function handleMouseEnter() {
    store.pauseTimers();
    store.set('hovering', true);
    markedReadyForMouseLeaveRef.current = false;
  }

  function resumeTimersIfWindowFocused() {
    if (store.state.isWindowFocused) {
      store.resumeTimers();
    }
  }

  function handleMouseLeave() {
    // Defer to `flushMouseLeave`: while toasts are transitioning out or a touch gesture is active it
    // records the intent and collapses later; otherwise it collapses immediately.
    markedReadyForMouseLeaveRef.current = true;
    flushMouseLeave();
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.pointerType === 'touch') {
      touchActiveRef.current = true;
    }
  }

  function handlePointerEnd(event: PointerEvent) {
    if (event.pointerType !== 'touch') {
      return;
    }

    touchActiveRef.current = false;
    flushMouseLeave();
  }

  function handleFocus() {
    if (handlingFocusGuardRef.current) {
      handlingFocusGuardRef.current = false;
      return;
    }

    if (focused.value) {
      return;
    }

    // Only set focused when the active element is focus-visible.
    // This prevents the viewport from staying expanded when clicking inside without
    // keyboard navigation.
    if (isFocusVisible(activeElement(ownerDocument(store.state.viewport)))) {
      store.set('focused', true);
      store.pauseTimers();
    }
  }

  function handleBlur(event: FocusEvent) {
    if (!focused.value || contains(store.state.viewport, event.relatedTarget as HTMLElement | null)) {
      return;
    }

    store.set('focused', false);
    resumeTimersIfWindowFocused();
  }

  // Evaluated on every render.
  const getDefaultProps = (): HTMLProps => ({
    tabIndex: -1,
    role: 'region',
    'aria-live': 'polite',
    'aria-atomic': false,
    'aria-relevant': 'additions text',
    'aria-label': 'Notifications',
    onMouseEnter: handleMouseEnter,
    onMouseMove: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    onClick: handleFocus,
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerEnd,
    onPointerCancel: handlePointerEnd,
    style: {
      '--toast-frontmost-height': frontmostHeight ? `${frontmostHeight}px` : undefined,
    } as Record<string, string | number>,
  });

  const state = computed<ToastViewportState>(() => ({
    expanded: expanded.value,
  }));

  const getFocusGuard = () =>
    !isEmpty.value && prevFocusElement.value
      ? renderFocusGuard({ onFocus: handleFocusGuard }, undefined)
      : null;

  const getElement = useRenderElement('div', componentProps, {
    ref: [componentProps.ref, store.setViewport],
    state,
    props: [
      getDefaultProps,
      elementProps,
      (prev: any) => ({
        ...prev,
        children: (
          <>
            {getFocusGuard()}
            {componentProps.children}
            {getFocusGuard()}
          </>
        ),
      }),
    ],
  });

  return (
    <>
      {getFocusGuard()}
      {getElement()}
      {!focused.value && highPriorityToasts.value.length > 0 && (
        <div style={visuallyHidden}>
          {highPriorityToasts.value.map((toast) => (
            <div key={toast.id} role="alert" aria-atomic>
              <div>{toast.title}</div>
              <div>{toast.description}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export interface ToastViewportState {
  /**
   * Whether toasts are expanded in the viewport.
   */
  expanded: boolean;
}

export interface ToastViewportProps extends BaseUIComponentProps<'div', ToastViewportState> {}

export namespace ToastViewport {
  export type State = ToastViewportState;
  export type Props = ToastViewportProps;
}
