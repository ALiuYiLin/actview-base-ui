import { computed, ref, unref } from 'actview';
import { EMPTY_ARRAY } from '@base-ui/actview-utils/empty';
import type { BaseUIChangeEventDetails } from '../internals/createBaseUIEventDetails';
import type { BaseUIEventReasons } from '../internals/reasons';
import type { MaybeRef, RefObject } from '../internals/types';

export function useCheckboxGroupParent(
  params: UseCheckboxGroupParentParameters,
): UseCheckboxGroupParentReturnValue {
  const { allValues = EMPTY_ARRAY, value, onValueChange: onValueChangeProp } = params;

  const uncontrolledStateRef = ref(unref(value));
  const disabledStatesRef = { current: new Map<string, boolean>() } as RefObject<
    Map<string, boolean>
  >;

  const status = ref<'on' | 'off' | 'mixed'>('mixed');
  // A `Map` rather than an object: checkbox values are consumer data, and a value like
  // `constructor` would otherwise read straight off `Object.prototype`.
  // Replace only the wrapper to rerender without cloning the growing registry.
  const childIdsState = ref({
    registry: new Map<string, readonly string[]>(),
  });

  const checked = computed(() => unref(value).length === allValues.length);
  const indeterminate = computed(() => unref(value).length !== allValues.length && unref(value).length > 0);

  const onValueChange = onValueChangeProp;

  const registerChildId = (childValue: string, childId: string) => {
    const childIds = childIdsState.value.registry;
    const ids = childIds.get(childValue);
    if (!ids?.includes(childId)) {
      childIds.set(childValue, ids ? ids.concat(childId) : [childId]);
      childIdsState.value = { registry: childIds };
    }

    return () => {
      const registeredIds = childIds.get(childValue);
      if (!registeredIds?.includes(childId)) {
        return;
      }

      const nextIds = registeredIds.filter((id) => id !== childId);
      if (nextIds.length === 0) {
        childIds.delete(childValue);
      } else {
        childIds.set(childValue, nextIds);
      }
      childIdsState.value = { registry: childIds };
    };
  };

  const getParentProps: UseCheckboxGroupParentReturnValue['getParentProps'] = () => ({
    indeterminate: indeterminate.value,
    checked: checked.value,
    // Children report their own rendered id, so a custom `id` survives and no unmounted
    // element is named.
    'aria-controls':
      allValues.flatMap((v) => childIdsState.value.registry.get(v) ?? EMPTY_ARRAY).join(' ') ||
      undefined,
    onCheckedChange(_checked, eventDetails) {
      const uncontrolledState = uncontrolledStateRef.value;

      // None except the disabled ones that are checked, which can't be changed.
      const none = allValues.filter(
        (v) => disabledStatesRef.current.get(v) && uncontrolledState.includes(v),
      );
      // "All" that are valid:
      // - any that aren't disabled
      // - disabled ones that are checked
      const all = allValues.filter(
        (v) => !disabledStatesRef.current.get(v) || uncontrolledState.includes(v),
      );

      const allOnOrOff = uncontrolledState.length === all.length || uncontrolledState.length === 0;

      if (allOnOrOff) {
        if (unref(value).length === all.length) {
          onValueChange?.(none, eventDetails);
        } else {
          onValueChange?.(all, eventDetails);
        }
        return;
      }

      let nextStatus: 'on' | 'off' | 'mixed' = 'mixed';
      let nextValue = uncontrolledState;

      if (status.value === 'mixed') {
        nextStatus = 'on';
        nextValue = all;
      } else if (status.value === 'on') {
        nextStatus = 'off';
        nextValue = none;
      }

      onValueChange?.(nextValue, eventDetails);

      if (!eventDetails.isCanceled) {
        status.value = nextStatus;
      }
    },
  });

  const getChildProps: UseCheckboxGroupParentReturnValue['getChildProps'] = (childValue: string) => ({
    checked: unref(value).includes(childValue),
    onCheckedChange(nextChecked, eventDetails) {
      const newValue = unref(value).slice();
      if (nextChecked) {
        newValue.push(childValue);
      } else {
        newValue.splice(newValue.indexOf(childValue), 1);
      }

      onValueChange?.(newValue, eventDetails);

      if (!eventDetails.isCanceled) {
        uncontrolledStateRef.value = newValue;
        status.value = 'mixed';
      }
    },
  });

  return {
    getParentProps,
    getChildProps,
    registerChildId,
    disabledStatesRef,
  };
}

export interface UseCheckboxGroupParentParameters {
  allValues?: string[] | undefined;
  value: MaybeRef<string[]>;
  onValueChange?:
    | ((
        value: string[],
        eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
      ) => void)
    | undefined;
}

export interface UseCheckboxGroupParentReturnValue {
  disabledStatesRef: RefObject<Map<string, boolean>>;
  /**
   * Reports the `id` of the element a child checkbox exposes.
   */
  registerChildId: (value: string, id: string) => () => void;
  getParentProps: () => {
    indeterminate: boolean;
    checked: boolean;
    'aria-controls': string | undefined;
    onCheckedChange: (
      checked: boolean,
      eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
    ) => void;
  };
  getChildProps: (value: string) => {
    checked: boolean;
    onCheckedChange: (
      checked: boolean,
      eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
    ) => void;
  };
}
