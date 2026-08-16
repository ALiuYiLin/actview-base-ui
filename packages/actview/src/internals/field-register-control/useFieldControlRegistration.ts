import { onUnmounted, unref, watch } from 'actview';
import { getCombinedFieldValidityData } from '../../field/utils/getCombinedFieldValidityData';
import { useFormContext } from '../form-context/FormContext';
import type { FieldValidityData } from '../../field/root/FieldRoot';
import type { MaybeRef, RefObject } from '../types';

export interface FieldControlRegistration {
  controlRef: RefObject<any>;
  id: string | undefined;
  name?: string | undefined;
  getValue?: (() => unknown) | undefined;
  value: unknown;
}

export function useFieldControlRegistration(params: UseFieldControlRegistrationParameters) {
  const {
    change,
    commit,
    invalid,
    markedDirtyRef,
    name,
    setRegisteredFieldName,
    registeredFieldIdRef,
    setValidityData,
    validityData,
  } = params;

  const formContext = useFormContext();
  // `formRef` is a stable `{ current }` object for the lifetime of the surrounding `<Form>`,
  // so capturing it once is safe (its identity never changes).
  const { formRef } = formContext.value;

  let activeFieldControlSourceRef: symbol | null = null;
  let registrationRef: FieldControlRegistration | null = null;
  let initialValueCapturedRef = false;

  const getValueForForm = () => {
    const registration = registrationRef;
    if (!registration) {
      return undefined;
    }

    if (registration.getValue) {
      return registration.getValue();
    }

    return registration.value;
  };

  function getRegistrationValue(registration: FieldControlRegistration) {
    return registration.value === undefined ? getValueForForm() : registration.value;
  }

  const validate = () => {
    const registration = registrationRef;
    markedDirtyRef.current = true;

    if (!registration) {
      commit(unref(validityData).value);
      return;
    }

    commit(getRegistrationValue(registration));
  };

  function refreshRegistration() {
    const registration = registrationRef;
    if (!registration || !registration.id) {
      return;
    }

    formRef.current.fields.set(registration.id, {
      getValue: getValueForForm,
      name: unref(name) ?? registration.name,
      controlRef: registration.controlRef,
      validityData: getCombinedFieldValidityData(unref(validityData), unref(invalid)),
      validate,
    });
  }

  function deleteRegistration(id = registrationRef?.id) {
    if (id) {
      formRef.current.fields.delete(id);
    }
  }

  // The baseline belongs to the field, not to a control instance: registration re-runs on every
  // value change, and a control that unmounts and remounts (or is swapped for another one) comes
  // back as a brand new registration. Capturing more than once would turn whichever value the
  // control happens to hold at that point into the initial value, so a modified field would read
  // pristine and its real initial value would read dirty. Consumers that want a fresh baseline
  // remount or key `<Field.Root>` itself.
  function captureInitialValue(registration: FieldControlRegistration) {
    if (initialValueCapturedRef) {
      return;
    }

    initialValueCapturedRef = true;
    const initialValue = getRegistrationValue(registration);
    const prev = unref(validityData);

    if (prev.initialValue !== initialValue) {
      setValidityData({ ...prev, initialValue });
    }
  }

  // Mirrors the React layout effect that refreshes the field's registry entry whenever its
  // validity data, external invalid state or effective name change.
  watch(
    [() => unref(validityData), () => unref(invalid), () => unref(name)],
    () => {
      const registration = registrationRef;
      if (!registration || !registration.id) {
        return;
      }

      setRegisteredFieldName(unref(name) ? undefined : registration.name);

      formRef.current.fields.set(registration.id, {
        getValue: getValueForForm,
        name: unref(name) ?? registration.name,
        controlRef: registration.controlRef,
        validityData: getCombinedFieldValidityData(unref(validityData), unref(invalid)),
        validate,
      });
    },
    { immediate: true },
  );

  onUnmounted(() => {
    const id = registrationRef?.id;
    if (id) {
      formRef.current.fields.delete(id);
    }
  });

  const register = (source: symbol, registration: FieldControlRegistration | undefined) => {
    if (!registration) {
      if (activeFieldControlSourceRef === source) {
        activeFieldControlSourceRef = null;
        change(undefined, true);
        deleteRegistration();
        registrationRef = null;
        setRegisteredFieldName(undefined);
        registeredFieldIdRef.current = undefined;
      }
      return;
    }

    const previousId = registrationRef?.id;
    const previousSource = activeFieldControlSourceRef;

    // Drop work owned by a replaced control, but not on first registration.
    if (previousSource && previousSource !== source) {
      change(undefined, true);
    }

    activeFieldControlSourceRef = source;
    registrationRef = registration;
    if (!unref(name)) {
      setRegisteredFieldName(registration.name);
    }
    registeredFieldIdRef.current = registration.id;

    if (previousId && previousId !== registration.id) {
      deleteRegistration(previousId);
    }

    captureInitialValue(registration);
    refreshRegistration();
  };

  return [validate, register] as const;
}

export interface UseFieldControlRegistrationParameters {
  change: (value: unknown, cancelPending?: boolean) => void;
  commit: (value: unknown) => void;
  invalid: MaybeRef<boolean>;
  markedDirtyRef: RefObject<boolean>;
  name: MaybeRef<string | undefined>;
  setRegisteredFieldName: (name: string | undefined) => void;
  registeredFieldIdRef: RefObject<string | undefined>;
  setValidityData: (data: FieldValidityData) => void;
  validityData: MaybeRef<FieldValidityData>;
}
