import {onUnmounted, watch, ref} from 'actview';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import type { FieldControlRegistration } from './useFieldControlRegistration';

export function useRegisterFieldControl(
  controlRef: FieldControlRegistration['controlRef'],
  id: FieldControlRegistration['id'],
  value: FieldControlRegistration['value'],
  getFormValueOverride?: FieldControlRegistration['getValue'],
  enabled = true,
  name?: FieldControlRegistration['name'],
) {
  const {registerFieldControl} = useFieldRootContext();
  const sourceRef = ref(Symbol());

  // Re-register without unregistering first: re-registration with the same id updates the
  // form's fields Map entry in place, while a delete + re-add would move the field to the
  // end of the Map every time its value changes.
  watch(
    () => [enabled, id, value, name, getFormValueOverride, controlRef] as const,
    () => {
      const source = sourceRef.value;

      if (!enabled) {
        registerFieldControl(source, undefined);
        return;
      }

      const registration: FieldControlRegistration = {
        controlRef,
        getValue: getFormValueOverride,
        id,
        name,
        value,
      };

      registerFieldControl(source, registration);
    },
    {flush: 'post', immediate: true},
  );

  onUnmounted(() => {
    registerFieldControl(sourceRef.value, undefined);
  });
}
