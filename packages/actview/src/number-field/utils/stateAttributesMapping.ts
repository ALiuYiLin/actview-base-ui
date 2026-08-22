import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import type { NumberFieldRootState } from '@/number-field/root/NumberFieldRoot';
import { fieldValidityMapping } from '@/internals/field-constants/constants';

export const stateAttributesMapping: StateAttributesMapping<NumberFieldRootState> = {
  inputValue: () => null,
  value: () => null,
  ...fieldValidityMapping,
};
