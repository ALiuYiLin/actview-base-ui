import { computed, onMounted, onUnmounted, ref, watch } from 'actview';
import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import {
  createGenericEventDetails,
  type BaseUIGenericEventDetails,
} from '../internals/createBaseUIEventDetails';
import { REASONS } from '../internals/reasons';
import type { BaseUIComponentProps, RefObject } from '../internals/types';
import { FormContext } from '../internals/form-context/FormContext';
import { useRenderElement } from '../internals/useRenderElement';

/**
 * A native form element with consolidated error handling.
 * Renders a `<form>` element.
 *
 * Documentation: [Base UI Form](https://base-ui.com/react/components/form)
 */
export function Form<FormValues extends Record<string, any> = Record<string, any>>(
  componentProps: Form.Props<FormValues>,
) {
  const formRef: FormContext['formRef'] = { current: { fields: new Map() } };
  const elementRef: RefObject<HTMLFormElement | null> = { current: null };
  const submittedRef = { current: false };
  const submitAttemptedRef: RefObject<boolean> = { current: false };

  const focusFirstInvalid = () => {
    // A field can be invalid without a focusable control (for example a checkbox group whose
    // custom validation failed while every checkbox is unmounted, disabled, or reassociated).
    // Keep submission blocked, but move focus to the first invalid field that has a usable control.
    // Registration order can diverge from DOM order (keyed fields reordered without
    // remounting, portals), so pick the first control by document position. For controls
    // in disconnected trees (e.g. separate shadow roots), where document position is
    // implementation-specific, keep registration order.
    let hasInvalid = false;
    let firstControl: HTMLElement | null = null;
    for (const field of formRef.current.fields.values()) {
      if (field.validityData.state.valid !== false) {
        continue;
      }
      hasInvalid = true;
      const control = field.controlRef.current;
      if (control && (!firstControl || comesBeforeInSameTree(control, firstControl))) {
        firstControl = control;
      }
    }
    if (firstControl) {
      firstControl.focus();
      if (firstControl.tagName === 'INPUT') {
        (firstControl as HTMLInputElement).select();
      }
      return true;
    }
    return hasInvalid;
  };

  const errors = ref<FormContext['errors'] | undefined>(componentProps.errors);

  watch(
    () => componentProps.errors,
    () => {
      errors.value = componentProps.errors;
    },
  );

  watch(errors, () => {
    if (!submittedRef.current) {
      return;
    }
    submittedRef.current = false;
    focusFirstInvalid();
  });

  const validate = (fieldName?: string) => {
    if (fieldName) {
      Array.from(formRef.current.fields.values())
        .find((field) => field.name === fieldName)
        ?.validate();
    } else {
      formRef.current.fields.forEach((field) => {
        field.validate();
      });
    }
  };

  onMounted(() => {
    if (componentProps.actionsRef) {
      componentProps.actionsRef.current = { validate };
    }
  });

  onUnmounted(() => {
    if (componentProps.actionsRef) {
      componentProps.actionsRef.current = null;
    }
  });

  const getFormProps = () => ({
    noValidate: true,
    onSubmit(event: Event) {
      submitAttemptedRef.current = true;

      // Async validation isn't supported to stop the submit event.
      formRef.current.fields.forEach((field) => {
        field.validate();
      });

      if (focusFirstInvalid()) {
        event.preventDefault();
        return;
      }

      submittedRef.current = true;
      componentProps.onSubmit?.(event as any);

      if (componentProps.onFormSubmit) {
        event.preventDefault();

        const formValues = {} as FormValues;
        formRef.current.fields.forEach((field) => {
          if (field.name) {
            (formValues as Record<string, any>)[field.name] = field.getValue();
          }
        });

        componentProps.onFormSubmit(formValues, createGenericEventDetails(REASONS.none, event));
      }
    },
  });

  const getElementProps = () => {
    const {
      render: _render,
      className: _className,
      validationMode: _validationMode,
      errors: _errors,
      onSubmit: _onSubmit,
      onFormSubmit: _onFormSubmit,
      actionsRef: _actionsRef,
      style: _style,
      ref: _ref,
      ...elementProps
    } = componentProps;
    return elementProps;
  };

  const getElement = useRenderElement('form', componentProps, {
    ref: [componentProps.ref, elementRef],
    props: [getFormProps, getElementProps],
  });

  const clearErrors = (name: string | undefined) => {
    if (!name) {
      return;
    }
    const previousErrors = errors.value;
    if (!previousErrors || !Object.hasOwn(previousErrors, name)) {
      return;
    }
    const nextErrors = { ...previousErrors };
    delete nextErrors[name];
    errors.value = nextErrors;
  };

  const contextValue = computed<FormContext>(() => ({
    elementRef,
    formRef,
    validationMode: componentProps.validationMode ?? 'onSubmit',
    errors: errors.value ?? EMPTY_OBJECT,
    clearErrors,
    submitAttemptedRef,
  }));

  return <FormContext.Provider value={contextValue}>{getElement()}</FormContext.Provider>;
}

export type FormSubmitEventReason = typeof REASONS.none;
export type FormSubmitEventDetails = BaseUIGenericEventDetails<Form.SubmitEventReason>;

export type FormValidationMode = 'onSubmit' | 'onBlur' | 'onChange';

export interface FormActions {
  validate: (fieldName?: string | undefined) => void;
}

export interface FormState {}

export interface FormProps<
  FormValues extends Record<string, any> = Record<string, any>,
> extends BaseUIComponentProps<'form', FormState> {
  /**
   * Determines when the form should be validated.
   * The `validationMode` prop on `<Field.Root>` takes precedence over this.
   *
   * - `onSubmit` (default): validates the field when the form is submitted, afterwards fields will re-validate on change.
   * - `onBlur`: validates a field when it loses focus.
   * - `onChange`: validates the field on every change to its value.
   *
   * @default 'onSubmit'
   */
  validationMode?: FormValidationMode | undefined;
  /**
   * Validation errors returned externally, typically after submission by a server or a form action.
   * This should be an object where keys correspond to the `name` attribute on `<Field.Root>`,
   * and values correspond to error(s) related to that field.
   */
  errors?: FormContext['errors'] | undefined;
  /**
   * Event handler called when the form is submitted.
   * `preventDefault()` is called on the native submit event when used.
   */
  onFormSubmit?:
    | ((formValues: FormValues, eventDetails: Form.SubmitEventDetails) => void)
    | undefined;
  /**
   * A ref to imperative actions.
   * - `validate`: Validates all fields when called. Optionally pass a field name to validate a single field.
   * @example
   * ```tsx
   * // validate all fields
   * actionsRef.current?.validate();
   *
   * // validate one field
   * actionsRef.current?.validate('email');
   * ```
   */
  actionsRef?: RefObject<Form.Actions | null> | undefined;
}

export namespace Form {
  export type Props<FormValues extends Record<string, any> = Record<string, any>> =
    FormProps<FormValues>;
  export type State = FormState;
  export type Actions = FormActions;
  export type ValidationMode = FormValidationMode;
  export type SubmitEventReason = FormSubmitEventReason;
  export type SubmitEventDetails = FormSubmitEventDetails;

  export type Values<FormValues extends Record<string, any> = Record<string, any>> = FormValues;
}

/* eslint-disable no-bitwise */
function comesBeforeInSameTree(element: Node, reference: Node) {
  const position = element.compareDocumentPosition(reference);
  return (
    (position & Node.DOCUMENT_POSITION_DISCONNECTED) === 0 &&
    (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
  );
}
