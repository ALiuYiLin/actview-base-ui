import {computed, ref, toRefs, watch} from 'actview';
import type { Ref } from 'actview';
import type { FieldRootState } from '../root/FieldRoot';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { fieldValidityMapping } from '@/internals/field-constants/constants';
import { useFormContext } from '@/internals/form-context/FormContext';
import type { BaseUIComponentProps } from '@/internals/types';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { transitionStatusMapping } from '@/internals/stateAttributesMapping';
import { type TransitionStatus, useTransitionStatus } from '@/internals/useTransitionStatus';
import { useRenderElement } from '@/internals/useRenderElement';
import { useMergedRefs } from '@/internals/useMergedRefs';

const stateAttributesMapping: StateAttributesMapping<FieldErrorState> = {
  ...fieldValidityMapping,
  ...transitionStatusMapping,
};

/**
 * An error message displayed if the field control fails validation.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldError(componentProps: FieldError.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  // 自持 ref：经 params.ref 合并链透传（不用 useRootElementFragment）。
  const rootRef = ref(null as HTMLElement | null);

  const generatedId = useBaseUiId();
  const id = computed(() => componentProps.id ?? generatedId);

  // context 载体直取（store-as-is）：字段渲染期 `.value` 求值即追踪。
  const {validityData, state: fieldState, name} = useFieldRootContext(false);
  const {setMessageIds} = useLabelableContext();
  const {errors} = useFormContext();

  // 渲染期消费的 props：computed 直读（setup 快照会停留在首渲染）。
  const match = computed(() => componentProps.match);

  const formError = computed(() => {
    const fieldName = name.value;
    return fieldName && Object.hasOwn(errors, fieldName) ? errors[fieldName] : null;
  });
  const hasFormError = computed(() =>
    !!(Array.isArray(formError.value) ? formError.value.length : formError.value),
  );
  const hasSpecificMatch = computed(() => typeof match.value === 'string');

  const rendered = computed(() => {
    if (match.value === true) {
      return true;
    }
    if (fieldState.value.disabled) {
      return false;
    }
    if (hasSpecificMatch.value) {
      return Boolean(validityData.value.state[match.value as keyof ValidityState]);
    }
    return hasFormError.value || validityData.value.state.valid === false;
  });

  const {mounted, transitionStatus, setMounted} = useTransitionStatus(rendered);

  // React 版 useIsoLayoutEffect：rendered 且 id 存在时注册进 messageIds
  const latestRegisteredId = ref(undefined as string | undefined);
  watch(
    () => [rendered.value, id.value] as const,
    ([renderedValue, idValue], _old, onCleanup) => {
      if (!renderedValue || !idValue) {
        return;
      }
      latestRegisteredId.value = idValue;
      setMessageIds((v) => v.concat(idValue));
      onCleanup(() => {
        setMessageIds((v) => v.filter((item) => item !== idValue));
      });
    },
    {flush: 'post', immediate: true},
  );

  // 组件卸载时 watch 的 onCleanup 不保证执行——显式注销
  watch(
    () => mounted.value,
    (_v, _old, onCleanup) => {
      onCleanup(() => {
        if (latestRegisteredId.value) {
          setMessageIds((v) => v.filter((item) => item !== latestRegisteredId.value));
        }
      });
    },
    {immediate: true},
  );

  const lastRenderedMessage = ref<any>(null);
  const lastRenderedMessageKey = ref<string | null>(null);

  useOpenChangeComplete({
    open: rendered,
    ref: rootRef,
    onComplete() {
      if (!rendered.value) {
        setMounted(false);
      }
    },
  });

  const state = computed<FieldErrorState>(() => ({
    ...fieldState.value,
    transitionStatus: transitionStatus.value,
  }));

  // 渲染期计算当前 error / errorMessage（rendered 时 children 直接用当前值，
  // 非 rendered 时用 lastRenderedMessage 缓存保持退出动画内容）。
  const error = computed<string | string[] | null | undefined>(() => {
    let currentError: string | string[] | null | undefined = validityData.value.error;
    if (!hasSpecificMatch.value && hasFormError.value) {
      currentError = formError.value as string | string[];
    } else if (validityData.value.errors.length > 1) {
      currentError = validityData.value.errors;
    }
    return currentError;
  });

  const errorMessage = computed(() => {
    let message: any = error.value;
    if (Array.isArray(error.value)) {
      message =
        error.value.length > 1 ? (
          <ul>
            {error.value.map((item) => (
              <li key={item as string}>{item as string}</li>
            ))}
          </ul>
        ) : (
          error.value[0]
        );
    }
    return message;
  });

  const errorKey = computed(() =>
    Array.isArray(error.value) ? JSON.stringify(error.value) : (error.value ?? null),
  );

  // 用户 children 优先；无用户 children 时用错误消息（rendered 用当前值并更新
  // 缓存，退出动画期间用 lastRenderedMessage 缓存）。
  const childrenOverride = computed(() => {
    const userChildren = childrenRef?.value;
    if (userChildren !== undefined) {
      return userChildren;
    }
    if (rendered.value) {
      lastRenderedMessageKey.value = errorKey.value;
      lastRenderedMessage.value = errorMessage.value;
      return errorMessage.value;
    }
    return lastRenderedMessage.value;
  });

  // 值形 props toRefs 活引用；children 解构排除（经 childrenOverride 覆盖注入）。
  const { className, render, style, children: childrenRef, ...elementRefs } = toRefs(
    componentProps,
  ) as Record<string, Ref<any>>;

  // ---- 渲染期求值：computed（.value 读取发生在 JSX 内 → 归渲染 effect）----
  const elementProps = computed(() => {
    const out: Record<string, any> = {};
    for (const k in elementRefs) out[k] = elementRefs[k].value;
    return out;
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return (
    <>
      {!mounted.value
        ? null
        : useRenderElement(
            'div',
            {
              className: className?.value,
              render: render?.value,
              style: style?.value,
            },
            {
              state: state.value,
              stateAttributesMapping,
              ref: useMergedRefs(rootRef, componentProps.ref as any),
              props: [{id: id.value}, elementProps.value, {children: childrenOverride.value}],
            },
          )}
    </>
  );
}

export interface FieldErrorState extends FieldRootState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface FieldErrorProps extends BaseUIComponentProps<'div', FieldErrorState> {
  /**
   * Determines whether to show the error message according to the field's
   * [ValidityState](https://developer.mozilla.org/en-US/docs/Web/API/ValidityState).
   * Specifying `true` will always show the error message, and lets external libraries
   * control the visibility.
   */
  match?: boolean | keyof ValidityState | undefined;
}

export namespace FieldError {
  export type State = FieldErrorState;
  export type Props = FieldErrorProps;
}
