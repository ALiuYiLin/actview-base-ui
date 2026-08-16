import { unref } from 'actview';
import type { Ref } from '@actview/core';

type MaybeRef<T> = T | Ref<T>;

export function useFocusableWhenDisabled(
  parameters: UseFocusableWhenDisabledParameters,
): UseFocusableWhenDisabledReturnValue {
  const getProps = (): FocusableWhenDisabledProps => {
    const focusableWhenDisabled = unref(parameters.focusableWhenDisabled);
    const disabled = unref(parameters.disabled);
    const composite = unref(parameters.composite) ?? false;
    const tabIndexProp = unref(parameters.tabIndex) ?? 0;
    const isNativeButton = unref(parameters.isNativeButton);

    const isFocusableComposite = composite && focusableWhenDisabled !== false;
    const isNonFocusableComposite = composite && focusableWhenDisabled === false;

    // we can't explicitly assign `undefined` to any of these props because it
    // would otherwise prevent subsequently merged props from setting them
    const additionalProps = {
      // allow Tabbing away from focusableWhenDisabled elements
      onKeyDown(event: KeyboardEvent) {
        if (disabled && focusableWhenDisabled && event.key !== 'Tab') {
          event.preventDefault();
        }
      },
    } as FocusableWhenDisabledProps;

    if (!composite) {
      additionalProps.tabIndex = tabIndexProp;

      if (!isNativeButton && disabled) {
        additionalProps.tabIndex = focusableWhenDisabled ? tabIndexProp : -1;
      }
    }

    if (
      (isNativeButton && (focusableWhenDisabled || isFocusableComposite)) ||
      (!isNativeButton && disabled)
    ) {
      additionalProps['aria-disabled'] = disabled;
    }

    if (isNativeButton && (!focusableWhenDisabled || isNonFocusableComposite)) {
      additionalProps.disabled = disabled;
    }

    return additionalProps;
  };

  return { props: getProps };
}

interface FocusableWhenDisabledProps {
  'aria-disabled'?: boolean | undefined;
  disabled?: boolean | undefined;
  onKeyDown: (event: KeyboardEvent) => void;
  tabIndex: number;
}

export interface UseFocusableWhenDisabledParameters {
  /**
   * Whether the component should be focusable when disabled.
   * When `undefined`, composite items are focusable when disabled by default.
   */
  focusableWhenDisabled?: MaybeRef<boolean | undefined> | undefined;
  /**
   * The disabled state of the component.
   */
  disabled: MaybeRef<boolean>;
  /**
   * Whether this is a composite item or not.
   * @default false
   */
  composite?: MaybeRef<boolean | undefined> | undefined;
  /**
   * @default 0
   */
  tabIndex?: MaybeRef<number | undefined> | undefined;
  /**
   * @default true
   */
  isNativeButton: MaybeRef<boolean>;
}

export interface UseFocusableWhenDisabledReturnValue {
  /**
   * Resolver for the props to spread on the element. Call it inside a render function.
   */
  props: () => FocusableWhenDisabledProps;
}

export interface UseFocusableWhenDisabledState {}
