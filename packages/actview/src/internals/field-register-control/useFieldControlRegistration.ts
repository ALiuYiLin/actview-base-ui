import { watch } from 'actview';
import { useFormContext } from '@/internals/form-context/FormContext';
import type { FormFieldRegistration } from '@/internals/form-context/FormContext';
import type { FieldValidityData } from '@/internals/form-context/FormContext';

export interface FieldControlRegistration {
  controlRef: {current: any};
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

  const activeFieldControlSourceRef = {current: null as symbol | null};
  const registrationRef = {current: null as FieldControlRegistration | null};
  const initialValueCapturedRef = {current: false};

  const getValueForForm = () => {
    const registration = registrationRef.current;
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
    const registration = registrationRef.current;
    markedDirtyRef.current = true;

    if (!registration) {
      commit(validityData.value);
      return;
    }

    commit(getRegistrationValue(registration));
  };

  function refreshRegistration() {
    const registration = registrationRef.current;
    if (!registration || !registration.id) {
      return;
    }

    formRef.current.fields.set(registration.id, {
      getValue: getValueForForm,
      name: name ?? registration.name,
      controlRef: registration.controlRef,
      validityData: getCombinedFieldValidityData(validityData.value, invalid),
      validate,
    });
  }

  function deleteRegistration(id = registrationRef.current?.id) {
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
    if (initialValueCapturedRef.current) {
      return;
    }

    initialValueCapturedRef.current = true;
    const initialValue = getRegistrationValue(registration);

    setValidityData((prev) =>
      prev.initialValue === initialValue ? prev : {...prev, initialValue},
    );
  }

  // React 版第一个 useIsoLayoutEffect：deps 变化时重注册
  watch(
    () => [invalid, name, validityData.value] as const,
    () => {
      const registration = registrationRef.current;
      if (!registration || !registration.id) {
        return;
      }

      setRegisteredFieldName(name ? undefined : registration.name);

      formRef.current.fields.set(registration.id, {
        getValue: getValueForForm,
        name: name ?? registration.name,
        controlRef: registration.controlRef,
        validityData: getCombinedFieldValidityData(validityData.value, invalid),
        validate,
      });
    },
    {flush: 'post', immediate: true},
  );

  // React 版第二个 useIsoLayoutEffect（cleanup）：卸载时删除注册
  watch(
    () => formRef,
    (_v, _old, onCleanup) => {
      const fields = formRef.current.fields;

      onCleanup(() => {
        const id = registrationRef.current?.id;
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
      if (activeFieldControlSourceRef.current === source) {
        activeFieldControlSourceRef.current = null;
        change(undefined, true);
        deleteRegistration();
        registrationRef.current = null;
        setRegisteredFieldName(undefined);
        registeredFieldIdRef.current = undefined;
      }
      return;
    }

    const previousId = registrationRef.current?.id;
    const previousSource = activeFieldControlSourceRef.current;

    // Drop work owned by a replaced control, but not on first registration.
    if (previousSource && previousSource !== source) {
      change(undefined, true);
    }

    activeFieldControlSourceRef.current = source;
    registrationRef.current = registration;
    if (!name) {
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

function toValueFormContext() {
  const ctx = useFormContext();
  return {formRef: ctx.value.formRef};
}

export interface UseFieldControlRegistrationParameters {
  change: (value: unknown, cancelPending?: boolean) => void;
  commit: (value: unknown) => void;
  invalid: boolean | undefined;
  markedDirtyRef: {current: boolean};
  name: string | undefined;
  setRegisteredFieldName: (name: string | undefined) => void;
  registeredFieldIdRef: {current: string | undefined};
  setValidityData: (
    updater: FieldValidityData | ((prev: FieldValidityData) => FieldValidityData),
  ) => void;
  validityData: {value: FieldValidityData};
}
