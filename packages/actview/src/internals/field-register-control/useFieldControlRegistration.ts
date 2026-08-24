import {watch, ref} from 'actview';
import type { ComputedRef } from 'actview';
import { useFormContext } from '@/internals/form-context/FormContext';
import type { FieldValidityData } from '@/field/root/FieldRoot';
import type { Ref } from 'actview';

export interface FieldControlRegistration {
  controlRef: Ref<any>;
  id: string | undefined;
  name?: string | undefined;
  getValue?: (() => unknown) | undefined;
  value: unknown;
}

function getCombinedFieldValidityData(
  validityData: FieldValidityData,
  invalid: boolean | undefined,
) {
  return {
    ...validityData,
    state: {
      ...validityData.state,
      ...(invalid === undefined ? {} : {valid: !invalid}),
    },
  };
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

  const {formRef} = toValueFormContext();

  const activeFieldControlSourceRef = ref(null as symbol | null);
  const registrationRef = ref(null as FieldControlRegistration | null);
  const initialValueCapturedRef = ref(false);

  const getValueForForm = () => {
    const registration = registrationRef.value;
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
    const registration = registrationRef.value;
    markedDirtyRef.value = true;

    if (!registration) {
      commit(validityData.value);
      return;
    }

    commit(getRegistrationValue(registration));
  };

  function refreshRegistration() {
    const registration = registrationRef.value;
    if (!registration || !registration.id) {
      return;
    }

    formRef.value.fields.set(registration.id, {
      getValue: getValueForForm,
      name: name ?? registration.name,
      controlRef: registration.controlRef,
      validityData: getCombinedFieldValidityData(validityData.value, invalid.value),
      validate,
    });
  }

  function deleteRegistration(id = registrationRef.value?.id) {
    if (id) {
      formRef.value.fields.delete(id);
    }
  }

  // The baseline belongs to the field, not to a control instance: registration re-runs on every
  // value change, and a control that unmounts and remounts (or is swapped for another one) comes
  // back as a brand new registration. Capturing more than once would turn whichever value the
  // control happens to hold at that point into the initial value, so a modified field would read
  // pristine and its real initial value would read dirty. Consumers that want a fresh baseline
  // remount or key `<Field.Root>` itself.
  function captureInitialValue(registration: FieldControlRegistration) {
    if (initialValueCapturedRef.value) {
      return;
    }

    initialValueCapturedRef.value = true;
    const initialValue = getRegistrationValue(registration);

    setValidityData((prev) =>
      prev.initialValue === initialValue ? prev : {...prev, initialValue},
    );
  }

  // React 版第一个 useIsoLayoutEffect：deps 变化时重注册
  watch(
    () => [invalid.value, name, validityData.value] as const,
    () => {
      const registration = registrationRef.value;
      if (!registration || !registration.id) {
        return;
      }

      setRegisteredFieldName(name ? undefined : registration.name);

      formRef.value.fields.set(registration.id, {
        getValue: getValueForForm,
        name: name ?? registration.name,
        controlRef: registration.controlRef,
        validityData: getCombinedFieldValidityData(validityData.value, invalid.value),
        validate,
      });
    },
    {flush: 'post', immediate: true},
  );

  // React 版第二个 useIsoLayoutEffect（cleanup）：卸载时删除注册
  watch(
    () => formRef,
    (_v, _old, onCleanup) => {
      const fields = formRef.value.fields;

      onCleanup(() => {
        const id = registrationRef.value?.id;
        if (id) {
          fields.delete(id);
        }
      });
    },
    {immediate: true},
  );

  const register = (
    source: symbol,
    registration: FieldControlRegistration | undefined,
  ) => {
    if (!registration) {
      if (activeFieldControlSourceRef.value === source) {
        activeFieldControlSourceRef.value = null;
        change(undefined, true);
        deleteRegistration();
        registrationRef.value = null;
        setRegisteredFieldName(undefined);
        registeredFieldIdRef.value = undefined;
      }
      return;
    }

    const previousId = registrationRef.value?.id;
    const previousSource = activeFieldControlSourceRef.value;

    // Drop work owned by a replaced control, but not on first registration.
    if (previousSource && previousSource !== source) {
      change(undefined, true);
    }

    activeFieldControlSourceRef.value = source;
    registrationRef.value = registration;
    if (!name) {
      setRegisteredFieldName(registration.name);
    }
    registeredFieldIdRef.value = registration.id;

    if (previousId && previousId !== registration.id) {
      deleteRegistration(previousId);
    }

    captureInitialValue(registration);
    refreshRegistration();
  };

  return [validate, register] as const;
}

function toValueFormContext() {
  const ctx = useFormContext();
  return {formRef: ctx.value.formRef};
}

export interface UseFieldControlRegistrationParameters {
  change: (value: unknown, cancelPending?: boolean) => void;
  commit: (value: unknown) => void;
  invalid: ComputedRef<boolean>;
  markedDirtyRef: Ref<boolean>;
  name: string | undefined;
  setRegisteredFieldName: (name: string | undefined) => void;
  registeredFieldIdRef: Ref<string | undefined>;
  setValidityData: (
    updater: FieldValidityData | ((prev: FieldValidityData) => FieldValidityData),
  ) => void;
  validityData: {value: FieldValidityData};
}
