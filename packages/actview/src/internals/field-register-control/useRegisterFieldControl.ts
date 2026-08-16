import { onUnmounted, unref, watch } from 'actview';
import { useRefWithInit } from '@base-ui/actview-utils/useRefWithInit';
import { useFieldRootContext } from '../field-root-context/FieldRootContext';
import type { FieldControlRegistration } from './useFieldControlRegistration';
import type { MaybeRef } from '../types';

export function useRegisterFieldControl(
  controlRef: FieldControlRegistration['controlRef'],
  id: MaybeRef<FieldControlRegistration['id']>,
  value: MaybeRef<FieldControlRegistration['value']>,
  getFormValueOverride?: FieldControlRegistration['getValue'],
  enabled: MaybeRef<boolean> = true,
  name?: MaybeRef<FieldControlRegistration['name']>,
) {
  const fieldRootContext = useFieldRootContext();
  // `registerFieldControl` is a stable closure provided by `<Field.Root>`; read it once.
  const { registerFieldControl } = fieldRootContext.value;

  const sourceRef = useRefWithInit(() => Symbol());

  // Re-register without unregistering first: re-registration with the same id updates the
  // form's fields Map entry in place, while a delete + re-add would move the field to the
  // end of the Map every time its value changes.
  watch(
    [() => unref(id), () => unref(value), () => unref(enabled), () => unref(name)],
    () => {
      const source = sourceRef.current;

      if (!unref(enabled)) {
        registerFieldControl(source, undefined);
        return;
      }

      const registration: FieldControlRegistration = {
        controlRef,
        getValue: getFormValueOverride,
        id: unref(id),
        name: unref(name),
        value: unref(value),
      };

      registerFieldControl(source, registration);
    },
    { immediate: true },
  );

  onUnmounted(() => {
    registerFieldControl(sourceRef.current, undefined);
  });
}
