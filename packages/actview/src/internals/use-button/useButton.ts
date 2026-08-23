import { onMounted, ref, toValue, watch } from 'actview';
import type { MaybeRefOrGetter } from '../types';
import { isHTMLElement } from '@floating-ui/utils/dom';
import { error } from '@base-ui/actview-utils/error';
import { makeEventPreventable, mergeProps } from '../../merge-props';
import { useCompositeRootContext } from '../composite/root/CompositeRootContext';
import type { BaseUIEvent } from '../types';
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

  const elementRef = ref<HTMLElement | null>(null);

  const compositeRootContext = useCompositeRootContext(true);
  const isCompositeItem =
    toValue(compositeProp) ?? toValue(compositeRootContext) !== undefined;

  const {props: focusableWhenDisabledProps} = useFocusableWhenDisabled({
    focusableWhenDisabled,
    disabled,
    composite: isCompositeItem,
    tabIndex,
    isNativeButton,
  });

  if (process.env.NODE_ENV !== 'production') {
    // React 版 useEffect：挂载后检查 nativeButton 语义（actview onMounted
    // 在根元素 ref 回调之后触发——elementRef 已填充）。
    onMounted(() => {
      const element = elementRef.value;
      if (!element) {
        return;
      }

      const isButtonTag = isButtonElement(element);

      if (toValue(isNativeButton)) {
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
    });
  }

  // handles a disabled composite button rendering another button, e.g.
  // <Toolbar.Button disabled render={<Menu.Trigger />} />
  // the `disabled` prop needs to pass through 2 `useButton`s then finally
  // delete the `disabled` attribute from DOM
  const updateDisabled = () => {
    const element = elementRef.value;

    if (!isButtonElement(element)) {
      return;
    }

    if (
      toValue(isCompositeItem) &&
      toValue(disabled) &&
      focusableWhenDisabledProps.value.disabled === undefined &&
      element.disabled
    ) {
      element.disabled = false;
    }
  };

  // React 版 useIsoLayoutEffect(updateDisabled, [updateDisabled])：ref 更新与
  // disabled/focusable 变化后同步一次（flush post——DOM 已提交）。
  watch([elementRef, disabled, focusableWhenDisabledProps], () => updateDisabled(), {
    flush: 'post',
  });

  const getButtonProps = (externalProps: GenericButtonProps = {}) => {
    const disabledValue = toValue(disabled);
    const isNativeValue = toValue(isNativeButton);
    const isCompositeValue = toValue(isCompositeItem);

    const {
      onClick: externalOnClick,
      onMouseDown: externalOnMouseDown,
      onKeyUp: externalOnKeyUp,
      onKeyDown: externalOnKeyDown,
      onPointerDown: externalOnPointerDown,
      ...otherExternalProps
    } = externalProps;

    return mergeProps(
      {
        onClick(event: MouseEvent) {
          if (disabledValue) {
            event.preventDefault();
            return;
          }
          externalOnClick?.(event as any);
        },
        onMouseDown(event: MouseEvent) {
          if (!disabledValue) {
            externalOnMouseDown?.(event as any);
          }
        },
        onKeyDown(event: BaseUIEvent<KeyboardEvent>) {
          if (disabledValue) {
            return;
          }

          makeEventPreventable(event);
          externalOnKeyDown?.(event as any);
          if (event.baseUIHandlerPrevented) {
            return;
          }

          const isCurrentTarget = event.target === event.currentTarget;
          const currentTarget = event.currentTarget as Element;
          const isButton = isButtonElement(currentTarget);
          const isLink = !isNativeValue && isValidLinkElement(currentTarget);
          const shouldClick = isCurrentTarget && (isNativeValue ? isButton : !isLink);
          const isEnterKey = event.key === 'Enter';
          const isSpaceKey = event.key === ' ';
          const role = currentTarget.getAttribute('role');
          const isTextNavigationRole =
            role?.startsWith('menuitem') || role === 'option' || role === 'gridcell';

          if (isCurrentTarget && isCompositeValue && isSpaceKey) {
            if (event.defaultPrevented && isTextNavigationRole) {
              return;
            }

            event.preventDefault();

            // Only a native-mode item that isn't a real <button> is excluded.
            if (!isNativeValue || isButton) {
              event.preventBaseUIHandler();
              dispatchClickWithModifiers(currentTarget, event);
            }

            return;
          }

          // Keyboard accessibility for native and non-native elements.
          if (!shouldClick || isNativeValue || (!isSpaceKey && !isEnterKey)) {
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
          externalOnKeyUp?.(event as any);

          if (
            event.target === event.currentTarget &&
            isNativeValue &&
            isCompositeValue &&
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
            !isNativeValue &&
            !isCompositeValue &&
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
          externalOnPointerDown?.(event as any);
        },
      },
      isNativeValue ? {type: 'button'} : {role: 'button'},
      focusableWhenDisabledProps.value,
      otherExternalProps,
    );
  };

  const buttonRef = (element: HTMLElement | null) => {
    elementRef.value = element;
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

interface GenericButtonProps extends AdditionalButtonProps {
  onClick?: ((event: MouseEvent) => void) | undefined;
  onMouseDown?: ((event: MouseEvent) => void) | undefined;
  onKeyUp?: ((event: KeyboardEvent) => void) | undefined;
  onKeyDown?: ((event: KeyboardEvent) => void) | undefined;
  onPointerDown?: ((event: PointerEvent) => void) | undefined;
  [key: string]: any;
}

interface AdditionalButtonProps extends Partial<{
  'aria-disabled': boolean | 'true' | 'false';
  disabled: boolean;
  role: string;
  tabIndex?: number | undefined;
}> {}

export interface UseButtonParameters {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: MaybeRefOrGetter<boolean>;
  /**
   * Whether the button may receive focus even if it is disabled.
   * @default false
   */
  focusableWhenDisabled?: MaybeRefOrGetter<boolean | undefined>;
  tabIndex?: MaybeRefOrGetter<number>;
  /**
   * Whether the component is being rendered as a native button.
   * @default true
   */
  native?: MaybeRefOrGetter<boolean>;
  /**
   * Whether the button is part of a composite widget.
   * When `true`, keyboard activation for Space occurs on keydown rather than keyup.
   * @default inferred from CompositeRoot context
   */
  composite?: MaybeRefOrGetter<boolean | undefined>;
}

export interface UseButtonReturnValue {
  /**
   * Resolver for the button props.
   * @param externalProps additional props for the button
   * @returns props that should be spread on the button
   */
  getButtonProps: (externalProps?: Record<string, any>) => Record<string, any>;
  /**
   * A ref to the button DOM element. This ref should be passed to the rendered element.
   * It is not a part of the props returned by `getButtonProps`.
   */
  buttonRef: (element: HTMLElement | null) => void;
}

export interface UseButtonState {}
