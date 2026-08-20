import { computed, defineComponent, onMounted, onUnmounted, ref, watch } from 'actview';
import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import {
  createGenericEventDetails,
  type BaseUIGenericEventDetails,
} from '../internals/createBaseUIEventDetails';
import { REASONS } from '../internals/reasons';
import type { BaseUIComponentProps, HTMLProps, RefObject } from '../internals/types';
import { FormContext } from '../internals/form-context/FormContext';
import { mergePropsN } from '../merge-props';

/**
 * A native form element with consolidated error handling.
 * Renders a `<form>` element.
 *
 * Documentation: [Base UI Form](https://base-ui.com/react/components/form)
 */
export const Form = defineComponent(function <
  FormValues extends Record<string, any> = Record<string, any>,
>(componentProps: Form.Props<FormValues>) {
  // ================= setup（只执行一次） =================
  // 注册表/标志位：稳定引用，生命周期内不变
  const formRef: FormContext['formRef'] = { current: { fields: new Map() } };
  // elementRef：ref()（value 形态，actview 模板 ref 原生支持）——
  // 渲染期 ref={elementRef} 显式挂载根 form 元素（根是 Provider 包裹 → 案例 6）。
  // ⚠️ 不能用手动 { current } 对象：actview 模板 ref 只赋值 ref() 创建的 Ref
  const elementRef = ref<HTMLFormElement | null>(null);
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

  // 外部 errors 同步（useValueChanged 等价）：errors prop 变化 → 本地 ref 更新
  const errors = ref<FormContext['errors'] | undefined>(componentProps.errors);

  watch(
    () => componentProps.errors,
    () => {
      errors.value = componentProps.errors;
    },
  );

  // 提交后 errors 更新 → 聚焦第一个无效字段（React useEffect [errors] 等价）
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

  // onSubmit：setup 定义——闭包读 props 代理（事件触发时最新值）+ setup refs，
  // 渲染期 defaultProps 引用同一函数（不重建，事件系统 invoker 复用）
  const onSubmit = (event: Event) => {
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
  };

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

  // context 值：computed 惰性缓存——依赖不变时引用稳定（对照 React useMemo）
  const contextValue = computed<FormContext>(() => ({
    elementRef,
    formRef,
    validationMode: componentProps.validationMode ?? 'onSubmit',
    errors: errors.value ?? EMPTY_OBJECT,
    clearErrors,
    submitAttemptedRef,
  }));

  // ================= render（每次更新执行） =================
  return () => {
    const {
      render,
      className,
      validationMode: _validationMode, // contextValue computed 已接管
      errors: _errors, // setup errors ref 已接管
      onSubmit: _onSubmit, // setup onSubmit 已接管（读代理最新）
      onFormSubmit: _onFormSubmit, // setup onSubmit 已接管
      actionsRef: _actionsRef, // setup onMounted/onUnmounted 已接管
      style,
      ref: _ref, // 用户 ref：elementRef 内部显式挂载，无需转发
      ...elementProps
    } = componentProps;

    const state: FormState = {};

    const defaultProps: HTMLProps = {
      noValidate: true,
      onSubmit,
    };

    const merged = mergePropsN([
      defaultProps,
      elementProps,
      {
        className: typeof className === 'function' ? className(state) : className,
        style: typeof style === 'function' ? style(state) : style,
      },
    ]);

    // render 三形态 + Provider 包裹。根是 Provider 包裹（form 在内层）——
    // elementRef 显式挂载到实际 form 元素（对照 CompositeRoot 边界，案例 6）
    if (typeof render === 'function') {
      return (
        <FormContext.Provider value={contextValue.value}>
          {render({ ...merged, ...state, ref: elementRef })}
        </FormContext.Provider>
      );
    }
    if (render) {
      const Tag = render.type as any;
      return (
        <FormContext.Provider value={contextValue.value}>
          <Tag key={render.key} {...render.props} {...merged} ref={elementRef} />
        </FormContext.Provider>
      );
    }
    return (
      <FormContext.Provider value={contextValue.value}>
        <form ref={elementRef} {...merged} />
      </FormContext.Provider>
    );
  };
}) as <FormValues extends Record<string, any> = Record<string, any>>(
  props: Form.Props<FormValues>,
) => any;

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
