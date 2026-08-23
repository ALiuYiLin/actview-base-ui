import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import { collapsibleOpenStateMapping as baseMapping } from '@/utils/collapsibleOpenStateMapping';
import type { AccordionItemState } from './AccordionItem';
import { transitionStatusMapping } from '@/internals/stateAttributesMapping';
import { AccordionItemDataAttributes } from '../AccordionDataAttributes';

export const accordionStateAttributesMapping: StateAttributesMapping<AccordionItemState> = {
  ...baseMapping,
  index: (value) => ({[AccordionItemDataAttributes.index]: String(value)}),
  ...transitionStatusMapping,
  value: () => null,
};
