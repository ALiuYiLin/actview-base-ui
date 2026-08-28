import {ref, toValue, useRootElement, watch, shallowRef, toRefs, unrefs} from 'actview';
import {
  createGenericEventDetails,
  type BaseUIGenericEventDetails,
} from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import type { BaseUIComponentProps } from '@/internals/types';
import { FormContext } from '@/internals/form-context/FormContext';
import type { FormContext as FormContextValue } from '@/internals/form-context/FormContext';
import { useValueChanged } from '@/internals/useValueChanged';
import { EMPTY_OBJECT } from '@/internals/empty';
import type { Ref } from 'actview';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * A native form element with consolidated error handling.
 * Renders a `<form>` element.
 *
 * Documentation: [Base UI Form](https://base-ui.com/react/components/form)
 */
export function Form(componentProps: Form.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // Provider 根（`<FormContext.Provider>`），无 Fragment 根问题。
  const rootRef = useRootElement();

  const formRef = shallowRef({fields: new Map<string, any>()});
  const elementRef = ref(null as HTMLFormElement | null);
  const submittedRef = ref(false);
  const submitAttemptedRef = ref(false);

  const validationMode = toValue(componentProps.validationMode) ?? 'onSubmit';
  const externalErrors = toValue(componentProps.errors);
  const onSubmit = componentProps.onSubmit;
  const onFormSubmit = componentProps.onFormSubmit;

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
    for (const field of formRef.value.fields.values()) {
      if (field.validityData.state.valid !== false) {
        continue;
      }
      hasInvalid = true;
      const control = field.controlRef.value;
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

  const errorsState = ref<any>(externalErrors);

  useValueChanged(() => externalErrors, () => {
    errorsState.value = externalErrors;
  });

  // React 版 useEffect：errors 变化且曾提交时聚焦第一个无效字段
  watch(
    () => errorsState.value,
    () => {
      if (!submittedRef.value) {
        return;
      }

      submittedRef.value = false;
      focusFirstInvalid();
    },
    {flush: 'post'},
  );

  const validate = (fieldName?: string) => {
    if (fieldName) {
      Array.from(formRef.value.fields.values())
        .find((field) => field.name === fieldName)
        ?.validate();
    } else {
      formRef.value.fields.forEach((field) => {
        field.validate();
      });
    }
  };

  // React 版 useImperativeHandle 等价物：actionsRef 就绪后写入
  watch(
    () => toValue(componentProps.actionsRef),
    (actionsRefObj) => {
      if (actionsRefObj) {
        (actionsRefObj as any).value = {validate};
      }
    },
    {immediate: true},
  );

  const clearErrors = (name: string | undefined) => {
    if (!name) {
      return;
    }
    errorsState.value = ((previousErrors: any) => {
      if (!previousErrors || !Object.hasOwn(previousErrors, name)) {
        return previousErrors;
      }
      const nextErrors = {...previousErrors};
      delete nextErrors[name];
      return nextErrors;
    })(errorsState.value);
  };

  const contextValue: FormContextValue = {
    elementRef,
    formRef,
    validationMode,
    errors: errorsState.value ?? EMPTY_OBJECT,
    clearErrors,
    submitAttemptedRef,
  };

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => [
      {
        noValidate: true,
        onSubmit(event: Event) {
          submitAttemptedRef.value = true;

          // Async validation isn't supported to stop the submit event.
          formRef.value.fields.forEach((field) => {
            field.validate();
          });

          if (focusFirstInvalid()) {
            event.preventDefault();
            return;
          }

          submittedRef.value = true;
          onSubmit?.(event as any);

          if (onFormSubmit) {
            event.preventDefault();

            const formValues = {} as Record<string, any>;
            formRef.value.fields.forEach((field) => {
              if (field.name) {
                formValues[field.name] = field.getValue();
              }
            });

            onFormSubmit(formValues, createGenericEventDetails(REASONS.none, event as any));
          }
        },
      },
      unrefs(elementProps),
    ],
    state: () => ({}),
    className,
    style,
    render,
    refs: () => [rootRef as any],
    children,
    defaultTag: 'form',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <FormContext.Provider value={contextValue}>
      {element()}
    </FormContext.Provider>
  );
}

export type FormSubmitEventReason = typeof REASONS.none;
export type FormSubmitEventDetails = BaseUIGenericEventDetails<Form.SubmitEventReason>;

export type FormValidationMode = 'onSubmit' | 'onBlur' | 'onChange';

export interface FormActions {
  validate: (fieldName?: string | undefined) => void;
}

export interface FormState {}

export interface FormProps<FormValues extends Record<string, any> = Record<string, any>>
  extends BaseUIComponentProps<'form', FormState> {
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
  errors?: Record<string, string | string[]> | undefined;
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
   * actionsRef.value?.validate();
   *
   * // validate one field
   * actionsRef.value?.validate('email');
   * ```
   */
  actionsRef?: Ref<Form.Actions | null> | undefined;
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
