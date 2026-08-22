import type { StateAttributesMapping } from '@/internals/getStateAttributesProps';
import type { ProgressRootState } from '@/progress/root/ProgressRoot';

export const progressStateAttributesMapping: StateAttributesMapping<ProgressRootState> = {
  status(value): Record<string, string> | null {
    return { [`data-${value}`]: '' };
  },
};
