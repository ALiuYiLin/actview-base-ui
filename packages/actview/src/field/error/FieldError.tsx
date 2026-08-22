import { computed, defineComponent, useRootElement, watch } from 'actview';
import { type FieldRootState } from '@/field/root/FieldRoot';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { fieldValidityMapping } from '@/internals/field-constants/constants';
import type { BaseUIComponentProps } from '@/internals/types';
import { getStateAttributesProps } from '@/internals/getStateAttributesProps';
import { useFormContext } from '@/internals/form-context/FormContext';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useOpenChangeComplete } from '@/internals/useOpenChangeComplete';
import { transitionStatusMapping } from '@/internals/stateAttributesMapping';
import { type TransitionStatus, useTransitionStatus } from '@/internals/useTransitionStatus';
import { mergePropsN } from '@/merge-props';

const stateAttributesMapping = {
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
  // ================= setup（只执行一次） =================
  // context hook 必须在 setup 顶层（AD-42）
  const fieldRootContext = useFieldRootContext(false);
  const labelableContext = useLabelableContext();
  const formContext = useFormContext();

  // useBaseUiId(idOverride)：用户 id 优先，否则生成
  const id = useBaseUiId(componentProps.id);

  const rendered = computed(() => {
    const match = componentProps.match;
    if (match === true) {
      return true;
    }
    if (fieldRootContext.value.state.disabled) {
      return false;
    }
    const hasSpecificMatch = typeof match === 'string';
    if (hasSpecificMatch) {
      return Boolean(fieldRootContext.value.validityData.state[match]);
    }
    const name = fieldRootContext.value.name;
    const errors = formContext.value.errors;
    const formError = name && Object.hasOwn(errors, name) ? errors[name] : null;
    const hasFormError = !!(Array.isArray(formError) ? formError.length : formError);
    return hasFormError || fieldRootContext.value.validityData.state.valid === false;
  });

  const { mounted, transitionStatus, setMounted } = useTransitionStatus(rendered);

  // 组件根 DOM：根是元素（div），useRootElement 自动绑定（案例 6）
  const rootRef = useRootElement();

  const state = computed<FieldErrorState>(() => ({
    ...fieldRootContext.value.state,
    transitionStatus: transitionStatus.value,
  }));

  const error = computed<null | string | string[]>(() => {
    const validityData = fieldRootContext.value.validityData;
    const match = componentProps.match;
    const hasSpecificMatch = typeof match === 'string';

    let errorValue: null | string | string[] = validityData.error ?? null;
    if (!hasSpecificMatch) {
      const name = fieldRootContext.value.name;
      const errors = formContext.value.errors;
      const formError = name && Object.hasOwn(errors, name) ? errors[name] : null;
      const hasFormError = !!(Array.isArray(formError) ? formError.length : formError);
      if (hasFormError) {
        errorValue = formError as string | string[];
      }
    } else if (validityData.errors.length > 1) {
      errorValue = validityData.errors;
    }
    return errorValue;
  });

  const errorMessage = computed(() => {
    const errorValue = error.value;
    if (Array.isArray(errorValue)) {
      if (errorValue.length > 1) {
        return (
          <ul>
            {errorValue.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        );
      }
      return errorValue[0] ?? null;
    }
    return errorValue;
  });

  // Register the error's id as an accessible description of the field control
  // (`aria-describedby`), mirroring `FieldDescription`. `setMessageIds` is replace-style,
  // so read the current list and append/filter (plantform-diff.md AD-24).
  watch(
    () => [rendered.value, id],
    (_nv, _ov, onCleanup) => {
      if (!rendered.value || !id) {
        return;
      }

      const current = labelableContext.value.messageIds;
      labelableContext.value.setMessageIds([...current, id]);

      onCleanup(() => {
        const currentIds = labelableContext.value.messageIds;
        labelableContext.value.setMessageIds(currentIds.filter((item) => item !== id));
      });
    },
    { immediate: true },
  );

  useOpenChangeComplete({
    open: rendered,
    ref: rootRef as unknown as { current?: HTMLElement | null; value?: HTMLElement | null },
    onComplete() {
      if (!rendered.value) {
        setMounted(false);
      }
    },
  });

  // ================= render（每次更新执行） =================
  // 条件渲染：ActView 的 setup 只跑一次，挂载判断必须在 render 函数里（AD-23）
  return () => {
    if (!mounted.value) {
      return null;
    }

    const {
      render,
      className,
      style,
      id: _idProp, // setup useBaseUiId 已接管
      match: _match, // setup rendered/error 已接管
      children: childrenProp,
      ref: _ref, // 用户 ref：根是元素，useRootElement 自动绑定
      ...elementProps
    } = componentProps;

    const stateValue = state.value;

    // state → data-* 属性（fieldValidityMapping + transitionStatusMapping）
    const stateAttributes = getStateAttributesProps(stateValue, stateAttributesMapping);

    const merged = mergePropsN([
      stateAttributes,
      elementProps,
      { id, children: childrenProp ?? errorMessage.value },
      {
        className: typeof className === 'function' ? className(stateValue) : className,
        style: typeof style === 'function' ? style(stateValue) : style,
      },
    ]);

    // render 三形态（对照 FieldsetLegend/FieldRootInner）
    if (typeof render === 'function') {
      return render({ ...merged, ...stateValue, ref: rootRef });
    }
    if (render) {
      const Tag = render.type as any;
      return <Tag key={render.key} {...render.props} {...merged} ref={rootRef} />;
    }
    return <div ref={rootRef} {...merged} />;
  };
}) as (props: FieldError.Props) => any;

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
