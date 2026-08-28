import { useRootElementFragment } from '@/internals/useRootElementFragment';
import {computed, toValue, watch, ref, toRefs, unrefs} from 'actview';
import { useControlled } from '@/utils/useControlled';
import { useFieldRootContext } from '@/internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '@/internals/field-register-control/useRegisterFieldControl';
import { useFormContext } from '@/internals/form-context/FormContext';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import { useLabelableId } from '@/internals/labelable-provider/useLabelableId';
import { fieldValidityMapping } from '@/internals/field-constants/constants';
import type { BaseUIComponentProps } from '@/internals/types';
import { useValueChanged } from '@/internals/useValueChanged';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import type { BaseUIChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import type { FieldRootState } from '../root/FieldRoot';
import { useRenderElement } from '@/internals/useRenderElementLegacy';

/**
 * The form control to label and validate.
 * Renders an `<input>` element.
 *
 * You can omit this part and use any Base UI input component instead. For example,
 * [Input](https://base-ui.com/react/components/input), [Checkbox](https://base-ui.com/react/components/checkbox),
 * or [Select](https://base-ui.com/react/components/select), among others, will work with Field out of the box.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldControl(componentProps: FieldControl.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const rootRef = useRootElementFragment();

  const {
    state: fieldState,
    name: fieldName,
    disabled: fieldDisabled,
    setTouched,
    setDirty,
    validityData,
    setFocused,
    setFilled,
    validationMode,
    validation,
  } = toValue(useFieldRootContext());
  const {clearErrors} = toValue(useFormContext());

  // disabled 须响应式：fieldset 祖先/Field.Root disabled 变化时联动
  const disabled = computed(
    () => fieldDisabled.value || (toValue(componentProps.disabled) ?? false),
  );
  const nameProp = toValue(componentProps.name);
  const idProp = toValue(componentProps.id);
  const valueProp = toValue(componentProps.value);
  const defaultValue = toValue(componentProps.defaultValue);
  const autoFocus = toValue(componentProps.autoFocus) ?? false;
  const onValueChange = componentProps.onValueChange;

  const name = fieldName.value ?? nameProp;

  const {labelId} = toValue(useLabelableContext());

  const id = useLabelableId({id: idProp});

  const [valueUnwrapped] = useControlled({
    controlled: valueProp,
    default: defaultValue,
    name: 'FieldControl',
    state: 'value',
  });

  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueUnwrapped.value : undefined;
  // The DOM value is always a string, so dirty comparisons must serialize the controlled value.
  const serializedValue = value == null ? undefined : String(value);

  const getValueFromInput = () => validation.inputRef.value?.value;

  useRegisterFieldControl(
    validation.inputRef,
    id,
    serializedValue,
    getValueFromInput,
    !disabled.value,
    nameProp,
  );

  // React 版 useIsoLayoutEffect：input 有值时标记 filled
  watch(
    () => validation.inputRef.value?.value,
    (v) => {
      if (v) {
        setFilled(true);
      }
    },
    {flush: 'post', immediate: true},
  );

  useValueChanged(() => serializedValue, () => {
    if (serializedValue === undefined) {
      return;
    }

    clearErrors(name);
    setDirty(serializedValue !== (validityData.value.initialValue ?? ''));
    setFilled(serializedValue !== '');

    validation.change(serializedValue);
  });

  const inputRef = ref(null as HTMLElement | null);

  // React 版 useIsoLayoutEffect：autoFocus 时标记 focused
  watch(
    () => autoFocus,
    (v) => {
      if (v && inputRef.value === activeElement(ownerDocument(inputRef.value))) {
        setFocused(true);
      }
    },
    {flush: 'post', immediate: true},
  );

  // ============ setup：toRefs 解构（渲染期读取保持实时——PD-15） ============
  const {className, render, style, ...elementProps} = toRefs(componentProps);

  const {element} = useRenderElement({
    props: () => {
      const merged: any = {};
      Object.assign(
        merged,
        {
          id,
          disabled: disabled.value,
          name,
          'aria-labelledby': labelId.value,
          autoFocus,
          ...(isControlled ? {value} : {defaultValue}),
          onChange(event: Event) {
            const inputValue = (event.currentTarget as HTMLInputElement).value;
            const details = createChangeEventDetails(REASONS.none, event as any);
            onValueChange?.(inputValue, details as any);

            // Controlled values sync from the `value` prop instead, so that a value the consumer
            // rejects or rewrites never reaches the field state.
            if (isControlled) {
              return;
            }

            // `validation.change` reads `markedDirtyRef`, so update dirty before validating.
            setDirty(inputValue !== (validityData.value.initialValue ?? ''));
            setFilled(inputValue !== '');

            // Workaround for https://github.com/react/react/issues/9023
            if (!(event as any).nativeEvent?.defaultPrevented && !details.isCanceled) {
              clearErrors(name);
              validation.change(inputValue);
            }
          },
          onFocus() {
            setFocused(true);
          },
          onBlur(event: Event) {
            const inputValue = (event.currentTarget as HTMLInputElement).value;
            setTouched(true);
            setFocused(false);

            if (validationMode.value === 'onBlur') {
              validation.commit(inputValue);
            }
          },
          onKeyDown(event: KeyboardEvent) {
            if (
              (event.currentTarget as HTMLInputElement).tagName === 'INPUT' &&
              event.key === 'Enter'
            ) {
              setTouched(true);
              validation.commit((event.currentTarget as HTMLInputElement).value);
            }
          },
        },
        unrefs(elementProps),
      );
      return [validation.getValidationProps(disabled.value, merged)];
    },
    state: () => ({
      ...fieldState.value,
      disabled: disabled.value,
    }),
    stateAttributesMapping: fieldValidityMapping,
    className,
    style,
    render,
    refs: () => [
      (el: any) => {
        validation.inputRef.value = el;
        inputRef.value = el;
        rootRef.value = el;
      },
    ],
    defaultTag: 'input',
  });

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  return <>{element()}</>;
}

function activeElement(doc: Document | null): Element | null {
  return doc?.activeElement ?? null;
}

function ownerDocument(node: Element | null | undefined): Document {
  return (node && node.ownerDocument) || document;
}

export interface FieldControlState extends FieldRootState {}

export interface FieldControlProps extends BaseUIComponentProps<'input', FieldControlState> {
  /**
   * Callback fired when the `value` changes. Use when controlled.
   */
  onValueChange?:
    | ((value: string, eventDetails: FieldControl.ChangeEventDetails) => void)
    | undefined;
  defaultValue?: string | number | readonly string[] | undefined;
  disabled?: boolean | undefined;
  name?: string | undefined;
  value?: string | number | readonly string[] | undefined;
  autoFocus?: boolean | undefined;
  id?: string | undefined;
}

export type FieldControlChangeEventReason = typeof REASONS.none;

export type FieldControlChangeEventDetails = BaseUIChangeEventDetails<FieldControl.ChangeEventReason>;

export namespace FieldControl {
  export type State = FieldControlState;
  export type Props = FieldControlProps;
  export type ChangeEventReason = FieldControlChangeEventReason;
  export type ChangeEventDetails = FieldControlChangeEventDetails;
}


