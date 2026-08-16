import { isHTMLElement } from '@floating-ui/utils/dom';
import { error } from '@base-ui/actview-utils/error';
import { computed, onMounted, unref, watch } from 'actview';
import { makeEventPreventable, mergeProps } from '../../merge-props';
import { useCompositeRootContext } from '../composite/root/CompositeRootContext';
import type { BaseUIEvent, HTMLProps, MaybeRef } from '../types';
import { useFocusableWhenDisabled } from '../../utils/useFocusableWhenDisabled';
import { dispatchClickWithModifiers } from '../../utils/dispatchClickWithModifiers';

export function useButton(parameters: UseButtonParameters = {}): UseButtonReturnValue {
  const {
    disabled = false,
    focusableWhenDisabled,
    tabIndex = 0,
    native: isNativeButton = true,
    composite: compositeProp,
  } = parameters;

  const elementRef = { current: null as HTMLElement | null };

  const compositeRootContext = useCompositeRootContext(true);
  const isCompositeItem = computed(
    () => unref(compositeProp) ?? compositeRootContext.value !== undefined,
  );

  const { props: getFocusableWhenDisabledProps } = useFocusableWhenDisabled({
    focusableWhenDisabled,
    disabled,
    composite: isCompositeItem,
    tabIndex,
    isNativeButton,
  });

  if (process.env.NODE_ENV !== 'production') {
    const checkNativeButton = () => {
      const element = elementRef.current;
      if (!element) {
        return;
      }

      const isButtonTag = isButtonElement(element);

      if (unref(isNativeButton)) {
        if (!isButtonTag) {
          const message =
            'A component that acts as a button expected a native <button> because the ' +
            '`nativeButton` prop is true. Rendering a non-<button> removes native button ' +
            'semantics, which can impact forms and accessibility. Use a real <button> in the ' +
            '`render` prop, or set `nativeButton` to `false`.';
          error(message);
        }
      } else if (isButtonTag) {
        const message =
          'A component that acts as a button expected a non-<button> because the `nativeButton` ' +
          'prop is false. Rendering a <button> keeps native behavior while Base UI applies ' +
          'non-native attributes and handlers, which can add unintended extra attributes (such ' +
          'as `role` or `aria-disabled`). Use a non-<button> in the `render` prop, or set ' +
          '`nativeButton` to `true`.';
        error(message);
      }
    };

    onMounted(checkNativeButton);
    watch(() => unref(isNativeButton), checkNativeButton);
  }

  // handles a disabled composite button rendering another button, e.g.
  // <Toolbar.Button disabled render={<Menu.Trigger />} />
  // the `disabled` prop needs to pass through 2 `useButton`s then finally
  // delete the `disabled` attribute from DOM
  const updateDisabled = () => {
    const element = elementRef.current;

    if (!isButtonElement(element)) {
      return;
    }

    const disabledValue = unref(disabled);
    const focusableWhenDisabledProps = getFocusableWhenDisabledProps();

    if (
      isCompositeItem.value &&
      disabledValue &&
      focusableWhenDisabledProps.disabled === undefined &&
      element.disabled
    ) {
      element.disabled = false;
    }
  };

  watch(
    [
      () => unref(disabled),
      () => getFocusableWhenDisabledProps().disabled,
      () => isCompositeItem.value,
    ],
    updateDisabled,
  );

  const getButtonProps = (externalProps: GenericButtonProps = {}) => {
    const {
      onClick: externalOnClick,
      onMouseDown: externalOnMouseDown,
      onKeyUp: externalOnKeyUp,
      onKeyDown: externalOnKeyDown,
      onPointerDown: externalOnPointerDown,
      ...otherExternalProps
    } = externalProps;

    const disabledValue = unref(disabled);
    const nativeValue = unref(isNativeButton);
    const compositeItemValue = isCompositeItem.value;
    const focusableWhenDisabledProps = getFocusableWhenDisabledProps();

    return mergeProps(
      {
        onClick(event: MouseEvent) {
          if (disabledValue) {
            event.preventDefault();
            return;
          }
          externalOnClick?.(event);
        },
        onMouseDown(event: MouseEvent) {
          if (!disabledValue) {
            externalOnMouseDown?.(event);
          }
        },
        onKeyDown(event: BaseUIEvent<KeyboardEvent>) {
          if (disabledValue) {
            return;
          }

          makeEventPreventable(event);
          externalOnKeyDown?.(event);
          if (event.baseUIHandlerPrevented) {
            return;
          }

          const isCurrentTarget = event.target === event.currentTarget;
          const currentTarget = event.currentTarget as Element;
          const isButton = isButtonElement(currentTarget);
          const isLink = !nativeValue && isValidLinkElement(currentTarget);
          const shouldClick = isCurrentTarget && (nativeValue ? isButton : !isLink);
          const isEnterKey = event.key === 'Enter';
          const isSpaceKey = event.key === ' ';
          const role = currentTarget.getAttribute('role');
          const isTextNavigationRole =
            role?.startsWith('menuitem') || role === 'option' || role === 'gridcell';

          if (isCurrentTarget && compositeItemValue && isSpaceKey) {
            if (event.defaultPrevented && isTextNavigationRole) {
              return;
            }

            event.preventDefault();

            // Only a native-mode item that isn't a real <button> is excluded.
            if (!nativeValue || isButton) {
              event.preventBaseUIHandler();
              dispatchClickWithModifiers(currentTarget, event);
            }

            return;
          }

          // Keyboard accessibility for native and non-native elements.
          if (!shouldClick || nativeValue || (!isSpaceKey && !isEnterKey)) {
            // Space activates links on keyup (`role="button"` semantics, matching the
            // composite path); prevent the page scroll Space would otherwise trigger.
            // Enter is left to the browser's native link activation.
            if (isCurrentTarget && isLink && isSpaceKey) {
              event.preventDefault();
            }
            return;
          }

          // Match native buttons: preventing the keydown's default cancels activation.
          if (event.defaultPrevented) {
            return;
          }

          event.preventDefault();

          if (isEnterKey) {
            event.preventBaseUIHandler();
            dispatchClickWithModifiers(currentTarget, event);
          }
        },
        onKeyUp(event: BaseUIEvent<KeyboardEvent>) {
          if (disabledValue) {
            return;
          }

          // calling preventDefault in keyUp on a <button> will not dispatch a click event if Space is pressed
          // https://codesandbox.io/p/sandbox/button-keyup-preventdefault-dn7f0
          makeEventPreventable(event);
          externalOnKeyUp?.(event);

          if (
            event.target === event.currentTarget &&
            nativeValue &&
            compositeItemValue &&
            isButtonElement(event.currentTarget as HTMLElement) &&
            event.key === ' '
          ) {
            event.preventDefault();
            return;
          }

          if (event.baseUIHandlerPrevented) {
            return;
          }

          // Keyboard accessibility for non interactive elements.
          // Match native buttons: preventing the keyup's default cancels Space activation.
          // Limitation: unlike a native <button>, a prevented *keydown* cannot cancel the
          // activation — no state is kept between keydown and keyup, so we can't tell
          // whether the keydown was prevented or even happened on this element.
          if (
            event.target === event.currentTarget &&
            !nativeValue &&
            !compositeItemValue &&
            !event.defaultPrevented &&
            event.key === ' '
          ) {
            event.preventBaseUIHandler();
            dispatchClickWithModifiers(event.currentTarget as Element, event);
          }
        },
        onPointerDown(event: PointerEvent) {
          if (disabledValue) {
            event.preventDefault();
            return;
          }
          externalOnPointerDown?.(event);
        },
      },
      nativeValue ? { type: 'button' } : { role: 'button' },
      focusableWhenDisabledProps,
      otherExternalProps,
    ) as HTMLProps;
  };

  const buttonRef = (element: HTMLElement | null) => {
    elementRef.current = element;
    updateDisabled();
  };

  return {
    getButtonProps,
    buttonRef,
  };
}

function isButtonElement(elem: Element | null): elem is HTMLButtonElement {
  return isHTMLElement(elem) && elem.tagName === 'BUTTON';
}

function isValidLinkElement(elem: Element | null): elem is HTMLAnchorElement {
  return isHTMLElement(elem) && elem.tagName === 'A' && Boolean((elem as HTMLAnchorElement).href);
}

interface GenericButtonProps extends Omit<HTMLProps, 'onClick'>, AdditionalButtonProps {
  onClick?: ((event: MouseEvent) => void) | undefined;
}

interface AdditionalButtonProps extends Partial<{
  'aria-disabled': boolean;
  disabled: boolean;
  role: string;
  tabIndex?: number | undefined;
}> {}

export interface UseButtonParameters {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: MaybeRef<boolean> | undefined;
  /**
   * Whether the button may receive focus even if it is disabled.
   * @default false
   */
  focusableWhenDisabled?: MaybeRef<boolean | undefined> | undefined;
  tabIndex?: MaybeRef<number | undefined> | undefined;
  /**
   * Whether the component is being rendered as a native button.
   * @default true
   */
  native?: MaybeRef<boolean> | undefined;
  /**
   * Whether the button is part of a composite widget.
   * When `true`, keyboard activation for Space occurs on keydown rather than keyup.
   * @default inferred from CompositeRoot context
   */
  composite?: MaybeRef<boolean | undefined> | undefined;
}

export interface UseButtonReturnValue {
  /**
   * Resolver for the button props.
   * @param externalProps additional props for the button
   * @returns props that should be spread on the button
   */
  getButtonProps: (externalProps?: HTMLProps) => HTMLProps;
  /**
   * A ref to the button DOM element. This ref should be passed to the rendered element.
   * It is not a part of the props returned by `getButtonProps`.
   */
  buttonRef: (element: HTMLElement | null) => void;
}

export interface UseButtonState {}
