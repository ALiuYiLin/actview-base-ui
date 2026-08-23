import { computed, defineComponent, ref, toValue, useRootElement, watch } from 'actview';
import type { FieldRootState } from '../root/FieldRoot';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { fieldValidityMapping } from '@/internals/field-constants/constants';
import { useFormContext } from '@/internals/form-context/FormContext';
import type { BaseUIComponentProps, HTMLProps } from '@/internals/types';
import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { transitionStatusMapping } from '@/internals/stateAttributesMapping';
import { type TransitionStatus, useTransitionStatus } from '@/internals/useTransitionStatus';

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
export const FieldError = defineComponent(function (componentProps: FieldError.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElement();

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
  const latestRegisteredId = {current: undefined as string | undefined};
  watch(
    () => [rendered.value, id.value] as const,
    ([renderedValue, idValue], _old, onCleanup) => {
      if (!renderedValue || !idValue) {
        return;
      }
      latestRegisteredId.current = idValue;
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
        if (latestRegisteredId.current) {
          setMessageIds((v) => v.filter((item) => item !== latestRegisteredId.current));
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

  // ============ render（每次渲染执行）：渲染期解构 props（PD-15） ============
  return () => {
    if (!mounted.value) {
      return null;
    }

    const {className, render, style, ...elementProps} = componentProps;

    let error: string | string[] | null | undefined = validityData.value.error;
    if (!hasSpecificMatch.value && hasFormError.value) {
      error = formError.value as string | string[];
    } else if (validityData.value.errors.length > 1) {
      error = validityData.value.errors;
    }

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

    const errorKey = Array.isArray(error) ? JSON.stringify(error) : (error ?? null);

    if (rendered.value && errorKey !== lastRenderedMessageKey.value) {
      lastRenderedMessageKey.value = errorKey;
      lastRenderedMessage.value = errorMessage;
    }

    const stateValue = state();
    const stateAttributes = getStateAttributesProps(stateValue, stateAttributesMapping);

    const merged: HTMLProps = {};
    Object.assign(merged, {id: id.value, children: rendered.value ? errorMessage : lastRenderedMessage.value}, elementProps,
      stateAttributes,
    );
    if (typeof className === 'function') { merged.className = className(stateValue);
    } else if (className !== undefined) {
      merged.className = className;
    }
    if (typeof style === 'function') {
      merged.style = style(stateValue);
    } else if (style !== undefined) {
      merged.style = style;
    }

    if (render) {
      if (typeof render === 'function') {
        return render({...merged, ...stateValue, ref: rootRef} as any);
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
    return <div {...merged} ref={rootRef} />;
  };
}) as unknown as (props: FieldError.Props) => JSX.Element;

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



