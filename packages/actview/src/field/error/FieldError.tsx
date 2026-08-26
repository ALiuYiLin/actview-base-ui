import { useRootElementFragment } from '@/internals/useRootElementFragment';
import { computed, ref, toValue, watch, toRefs, unrefs } from 'actview';
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
  const rootRef = useRootElementFragment();

  const generatedId = useBaseUiId();
  const id = computed(() => toValue(componentProps.id) ?? generatedId);

  const {validityData, state: fieldState, name} = toValue(useFieldRootContext(false));
  const {setMessageIds} = toValue(useLabelableContext());
  const {errors} = toValue(useFormContext());

  const match = computed(() => toValue(componentProps.match));

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

  const state = () => ({
    ...fieldState.value,
    transitionStatus: transitionStatus.value,
  });

  // 渲染期计算当前 error / errorMessage（rendered 时 children 直接用当前值，
  // 非 rendered 时用 lastRenderedMessage 缓存保持退出动画内容）。
  const computeError = (): string | string[] | null | undefined => {
    let error: string | string[] | null | undefined = validityData.value.error;
    if (!hasSpecificMatch.value && hasFormError.value) {
      error = formError.value as string | string[];
    } else if (validityData.value.errors.length > 1) {
      error = validityData.value.errors;
    }
    return error;
  };

  const computeErrorMessage = (error: string | string[] | null | undefined) => {
    let errorMessage: any = error;
    if (Array.isArray(error)) {
      errorMessage =
        error.length > 1 ? (
          <ul>
            {error.map((message) => (
              <li key={message as string}>{message as string}</li>
            ))}
          </ul>
        ) : (
          error[0]
        );
    }
    return errorMessage;
  };

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, children, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => {
      const error = computeError();
      const errorMessage = computeErrorMessage(error);

      const errorKey = Array.isArray(error) ? JSON.stringify(error) : (error ?? null);

      if (rendered.value && errorKey !== lastRenderedMessageKey.value) {
        lastRenderedMessageKey.value = errorKey;
        lastRenderedMessage.value = errorMessage;
      }

      return [{id: id.value}, unrefs(elementProps)];
    },
    state,
    stateAttributesMapping,
    className,
    style,
    render,
    refs: () => [rootRef as any],
    // 用户 children 优先；无用户 children 时用错误消息（rendered 用当前值，
    // 退出动画期间用 lastRenderedMessage 缓存）。
    children: () => {
      const userChildren = children?.value;
      if (userChildren !== undefined) {
        return userChildren;
      }
      return rendered.value ? computeErrorMessage(computeError()) : lastRenderedMessage.value;
    },
    defaultTag: 'div',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{!mounted.value ? null : element()}</>;
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



