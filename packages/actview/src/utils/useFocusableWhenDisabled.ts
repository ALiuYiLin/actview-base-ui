import { computed, toValue } from 'actview';
import type { MaybeRefOrGetter } from '@/internals/types';

/**
 * Computes the props that make a disabled element focusable (or not),
 * depending on the `focusableWhenDisabled` and `composite` settings.
 * (actview 转译版：React `useMemo` → `computed`，参数支持 ref/getter 响应式解包。)
 */
export function useFocusableWhenDisabled(
  parameters: UseFocusableWhenDisabledParameters,
): UseFocusableWhenDisabledReturnValue {
  const {
    focusableWhenDisabled,
    disabled,
    composite = false,
    tabIndex: tabIndexProp = 0,
    isNativeButton,
  } = parameters;

  const props = computed(() => {
    const compositeValue = toValue(composite);
    const disabledValue = toValue(disabled);
    const focusableValue = toValue(focusableWhenDisabled);
    const tabIndexValue = toValue(tabIndexProp);
    const isNativeValue = toValue(isNativeButton);

    const isFocusableComposite = compositeValue && focusableValue !== false;
    const isNonFocusableComposite = compositeValue && focusableValue === false;

    // we can't explicitly assign `undefined` to any of these props because it
    // would otherwise prevent subsequently merged props from setting them
    const additionalProps = {
      // allow Tabbing away from focusableWhenDisabled elements
      onKeyDown(event: KeyboardEvent) {
        if (disabledValue && focusableValue && event.key !== 'Tab') {
          event.preventDefault();
        }
      },
    } as FocusableWhenDisabledProps;

    if (!compositeValue) {
      additionalProps.tabIndex = tabIndexValue;

      if (!isNativeValue && disabledValue) {
        additionalProps.tabIndex = focusableValue ? tabIndexValue : -1;
      }
    }

    if (
      (isNativeValue && (focusableValue || isFocusableComposite)) ||
      (!isNativeValue && disabledValue)
    ) {
      additionalProps['aria-disabled'] = disabledValue;
    }

    if (isNativeValue && (!focusableValue || isNonFocusableComposite)) {
      additionalProps.disabled = disabledValue;
    }

    return additionalProps;
  });

  return {props};
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
  focusableWhenDisabled?: MaybeRefOrGetter<boolean | undefined>;
  /**
   * The disabled state of the component.
   */
  disabled: MaybeRefOrGetter<boolean>;
  /**
   * Whether this is a composite item or not.
   * @default false
   */
  composite?: MaybeRefOrGetter<boolean> | undefined;
  /**
   * @default 0
   */
  tabIndex?: MaybeRefOrGetter<number> | undefined;
  /**
   * @default true
   */
  isNativeButton: MaybeRefOrGetter<boolean>;
}

export interface UseFocusableWhenDisabledReturnValue {
  props: {value: FocusableWhenDisabledProps};
}

export interface UseFocusableWhenDisabledState {}
