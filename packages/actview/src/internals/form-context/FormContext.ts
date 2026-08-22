import type { FieldValidityData } from '@/field/root/FieldRoot';
import { NOOP } from '@/internals/noop';
import type { Form } from '@/form';
import type { RefObject } from '@/internals/types';
import { createContext } from 'actview';
import type { Ref } from '@actview/core';

export type Errors = Record<string, string | string[]>;

export interface FormContext {
  errors: Errors;
  clearErrors: (name: string | undefined) => void;
  // ref()（value 形态）——actview 模板 ref 只赋值 ref() 创建的 Ref，
  // 消费方必须读 .value（Field 家族旧写法读 .current 是错的，迁移时改）
  elementRef: Ref<HTMLFormElement | null>;
  formRef: RefObject<{
    fields: Map<
      string,
      {
        name: string | undefined;
        /**
         * After this returns, the field registry entry reflects the latest synchronous
         * validity verdict. Async validators do not block submit.
         */
        validate: () => void;
        validityData: FieldValidityData;
        controlRef: RefObject<HTMLElement | null>;
        getValue: () => unknown;
      }
    >;
  }>;
  validationMode: Form.ValidationMode;
  submitAttemptedRef: RefObject<boolean>;
}

// 框架官方 createContext（单参数：defaultValue）。Provider 注入 ref 本体，
// use() 返回该 ref，渲染期读 .value 建立响应式追踪（对照 ToggleGroupContext）。
// 无 Provider 时回落完整默认对象（与自封装版行为一致）
const DEFAULT_FORM_CONTEXT_VALUE: FormContext = {
  elementRef: { value: null } as Ref<HTMLFormElement | null>,
  formRef: {
    current: {
      fields: new Map(),
    },
  },
  errors: {},
  clearErrors: NOOP,
  validationMode: 'onSubmit',
  submitAttemptedRef: {
    current: false,
  },
};

export const FormContext = createContext<FormContext>(DEFAULT_FORM_CONTEXT_VALUE);

export function useFormContext() {
  return FormContext.use();
}
