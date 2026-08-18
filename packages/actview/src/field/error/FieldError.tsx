import { computed, watch } from 'actview';
import { type FieldRootState } from '../root/FieldRoot';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import { fieldValidityMapping } from '../../internals/field-constants/constants';
import { useFormContext } from '../../internals/form-context/FormContext';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { useRenderElement } from '../../internals/useRenderElement';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import { type TransitionStatus, useTransitionStatus } from '../../internals/useTransitionStatus';

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
  const fieldRootContext = useFieldRootContext(false);
  const labelableContext = useLabelableContext();
  const formContext = useFormContext();

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

  const errorRef: { current: HTMLDivElement | null } = { current: null };

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

  const getElementProps = (prev: HTMLProps) => {
    const {
      render: _render,
      id: _idProp,
      className: _className,
      match: _match,
      style: _style,
      children: childrenProp,
      ...elementProps
    } = componentProps;
    return {
      ...prev,
      ...elementProps,
      id,
      // User-provided children win; otherwise fall back to the computed error message.
      children: childrenProp ?? errorMessage.value,
    };
  };

  const getElement = useRenderElement('div', componentProps, {
    ref: [componentProps.ref, errorRef],
    state,
    props: [getElementProps],
    stateAttributesMapping,
  });

  useOpenChangeComplete({
    open: rendered,
    ref: errorRef,
    onComplete() {
      if (!rendered.value) {
        setMounted(false);
      }
    },
  });

  // Conditionally render: ActView's setup runs once, so the mount check must live in the
  // render function (JSX), not as a setup-time early return (plantform-diff.md AD-23).
  return <>{mounted.value ? getElement() : null}</>;
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
