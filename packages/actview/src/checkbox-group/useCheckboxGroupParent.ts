import {ref, toValue, shallowRef} from 'actview';
import type { ComputedRef } from 'actview';
import { EMPTY_ARRAY } from '@/internals/noop';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import type { BaseUIEventReasons } from '@/internals/reasons';
import type { Ref } from 'actview';

export function useCheckboxGroupParent(
  params: UseCheckboxGroupParentParameters,
): UseCheckboxGroupParentReturnValue {
  const {allValues = EMPTY_ARRAY, value, onValueChange: onValueChangeProp} = params;

  const uncontrolledStateRef = ref(value.value);
  const disabledStatesRef = shallowRef(new Map<string, boolean>());

  const status = ref<'on' | 'off' | 'mixed'>('mixed');
  // A `Map` rather than an object: checkbox values are consumer data, and a value like
  // `constructor` would otherwise read straight off `Object.prototype`.
  // Replace only the wrapper to rerender without cloning the growing registry.
  const childIdsState = ref({
    registry: new Map<string, readonly string[]>(),
  });

  const registerChildId = (childValue: string, childId: string) => {
    const childIds = childIdsState.value.registry;
    const ids = childIds.get(childValue);
    if (!ids?.includes(childId)) {
      childIds.set(childValue, ids ? ids.concat(childId) : [childId]);
      childIdsState.value = {registry: childIds};
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
      childIdsState.value = {registry: childIds};
    };
  };

  const getParentProps: UseCheckboxGroupParentReturnValue['getParentProps'] = () => {
    const currentValue = value.value;
    const currentStatus = status.value;
    // 渲染期计算（setup 快照会导致 parent 的 checked/indeterminate 永不更新）
    const checked = currentValue.length === allValues.length;
    const indeterminate = currentValue.length !== allValues.length && currentValue.length > 0;

    return {
      indeterminate,
      checked,
      // Children report their own rendered id, so a custom `id` survives and no unmounted
      // element is named.
      'aria-controls':
        allValues.flatMap((v) => childIdsState.value.registry.get(v) ?? EMPTY_ARRAY).join(' ') ||
        undefined,
      onCheckedChange(_: boolean, eventDetails: BaseUIChangeEventDetails<any>) {
        const uncontrolledState = uncontrolledStateRef.value;
        const emitChange = onValueChangeProp!;

        // None except the disabled ones that are checked, which can't be changed.
        const none = allValues.filter(
          (v) => disabledStatesRef.value.get(v) && uncontrolledState.includes(v),
        );
        // "All" that are valid:
        // - any that aren't disabled
        // - disabled ones that are checked
        const all = allValues.filter(
          (v) => !disabledStatesRef.value.get(v) || uncontrolledState.includes(v),
        );

        const allOnOrOff =
          uncontrolledState.length === all.length || uncontrolledState.length === 0;

        if (allOnOrOff) {
          if (currentValue.length === all.length) {
            emitChange(none, eventDetails);
          } else {
            emitChange(all, eventDetails);
          }
          return;
        }

        let nextStatus: 'on' | 'off' | 'mixed' = 'mixed';
        let nextValue = uncontrolledState;

        if (currentStatus === 'mixed') {
          nextStatus = 'on';
          nextValue = all;
        } else if (currentStatus === 'on') {
          nextStatus = 'off';
          nextValue = none;
        }

        emitChange(nextValue, eventDetails);

        if (!eventDetails.isCanceled) {
          status.value = nextStatus;
        }
      },
    };
  };

  const getChildProps: UseCheckboxGroupParentReturnValue['getChildProps'] = (childValue: string) => {
    const currentValue = value.value;
    return {
      checked: currentValue.includes(childValue),
      onCheckedChange(nextChecked: boolean, eventDetails: BaseUIChangeEventDetails<any>) {
        const newValue = currentValue.slice();
        if (nextChecked) {
          newValue.push(childValue);
        } else {
          newValue.splice(newValue.indexOf(childValue), 1);
        }

        onValueChangeProp!(newValue, eventDetails);

        if (!eventDetails.isCanceled) {
          uncontrolledStateRef.value = newValue;
          status.value = 'mixed';
        }
      },
    };
  };

  return {
    getParentProps,
    getChildProps,
    registerChildId,
    disabledStatesRef,
  };
}

export interface UseCheckboxGroupParentParameters {
  allValues?: string[] | undefined;
  value: ComputedRef<string[]>;
  onValueChange?: ((value: string[], eventDetails: any) => void) | undefined;
}

export interface UseCheckboxGroupParentReturnValue {
  disabledStatesRef: Ref<Map<string, boolean>>;
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
