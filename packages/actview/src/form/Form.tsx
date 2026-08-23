import { defineComponent, ref, toValue, useRootElement, watch } from 'actview';
import {
  createGenericEventDetails,
  type BaseUIGenericEventDetails,
} from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import { FormContext } from '@/internals/form-context/FormContext';
import type { FormContext as FormContextValue } from '@/internals/form-context/FormContext';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { useValueChanged } from '@/internals/useValueChanged';
import { EMPTY_OBJECT } from '@/internals/empty';

/**
 * A native form element with consolidated error handling.
 * Renders a `<form>` element.
 *
 * Documentation: [Base UI Form](https://base-ui.com/react/components/form)
 */
export const Form: any = defineComponent(function (componentProps: Form.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

  const formRef = {current: {fields: new Map<string, any>()}};
  const elementRef = {current: null as HTMLFormElement | null};
  const submittedRef = {current: false};
  const submitAttemptedRef = {current: false};

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

  const errorsState = ref<any>(externalErrors);

  useValueChanged(() => externalErrors, () => {
    errorsState.value = externalErrors;
  });

  // React 版 useEffect：errors 变化且曾提交时聚焦第一个无效字段
  watch(
    () => errorsState.value,
    () => {
      if (!submittedRef.current) {
        return;
      }

      submittedRef.current = false;
      focusFirstInvalid();
    },
    {flush: 'post'},
  );

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

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    const {className, render, style, ...elementProps} = componentProps;

    // errors 是响应值，contextValue 的 errors 需反映最新值
    contextValue.errors = errorsState.value ?? EMPTY_OBJECT;

    const merged: HTMLProps = {};
    Object.assign(
      merged,
      {
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
          onSubmit?.(event as any);

          if (onFormSubmit) {
            event.preventDefault();

            const formValues = {} as Record<string, any>;
            formRef.current.fields.forEach((field) => {
              if (field.name) {
                formValues[field.name] = field.getValue();
              }
            });

            onFormSubmit(formValues, createGenericEventDetails(REASONS.none, event as any));
          }
        },
      },
      elementProps,
    );
    if (typeof className === 'function') {
      merged.className = className({});
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = style({});
    } else if (style !== undefined) {
      merged.style = style;
    }

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ref: rootRef} as any);
      }
      const renderProps = render.props ?? {};
      const {className: renderClassName, style: renderStyle, ...restRenderProps} = renderProps;
      const Tag = render.type as any;
      const mergedRenderProps = Object.assign({}, merged, restRenderProps);
      mergedRenderProps.className =
        typeof merged.className === 'string' && typeof renderClassName === 'string'
          ? `${merged.className} ${renderClassName}`.trim()
          : (merged.className ?? renderClassName);
      mergedRenderProps.style = Object.assign({}, merged.style, renderStyle);
      return <Tag key={render.key} {...mergedRenderProps} ref={rootRef} />;
    }
    return (
      <FormContext.Provider value={contextValue}>
        <form {...merged} ref={rootRef} />
      </FormContext.Provider>
    );
  };
}) as unknown as (props: Form.Props) => JSX.Element;

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
   * actionsRef.current?.validate();
   *
   * // validate one field
   * actionsRef.current?.validate('email');
   * ```
   */
  actionsRef?: {current: Form.Actions | null} | undefined;
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
