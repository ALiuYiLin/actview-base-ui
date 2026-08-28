import {onUnmounted, watch, ref, computed, toValue} from 'actview';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import type { FieldControlRegistration } from './useFieldControlRegistration';
import type { MaybeRefOrGetter } from '@/internals/types';
import type { Ref } from 'actview';

export function useRegisterFieldControl(
  controlRef: FieldControlRegistration['controlRef'],
  id: MaybeRefOrGetter<FieldControlRegistration['id']>,
  value: MaybeRefOrGetter<FieldControlRegistration['value']>,
  getFormValueOverride?: FieldControlRegistration['getValue'],
  enabled: MaybeRefOrGetter<boolean> = true,
  name?: MaybeRefOrGetter<FieldControlRegistration['name']>,
) {
  const {registerFieldControl} = useFieldRootContext();
  const sourceRef = ref(Symbol());

  // 参数归一：plain / ref / getter 统一转 computed（watch 依赖实时求值）。
  const enabledValue = computed(() => toValue(enabled));
  const idValue = computed(() => toValue(id));
  const valueComputed = computed(() => toValue(value));
  const nameValue = computed(() => toValue(name));

  // Re-register without unregistering first: re-registration with the same id updates the
  // form's fields Map entry in place, while a delete + re-add would move the field to the
  // end of the Map every time its value changes.
  watch(
    () => [enabledValue.value, idValue.value, valueComputed.value, nameValue.value, getFormValueOverride, controlRef] as const,
    () => {
      const source = sourceRef.value;

      if (!enabledValue.value) {
        registerFieldControl(source, undefined);
        return;
      }

      const registration: FieldControlRegistration = {
        controlRef,
        getValue: getFormValueOverride,
        id: idValue.value,
        name: nameValue.value,
        value: valueComputed.value,
      };

      registerFieldControl(source, registration);
    },
    {flush: 'post', immediate: true},
  );

  onUnmounted(() => {
    registerFieldControl(sourceRef.value, undefined);
  });
}
