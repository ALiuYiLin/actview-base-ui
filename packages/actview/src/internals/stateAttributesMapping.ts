import type { StateAttributesMapping } from './getStateAttributesProps';

/**
 * The transition status of a component using `useTransitionStatus`.
 * Aligns with the React contract (to be migrated with `useTransitionStatus`).
 */
export type TransitionStatus = 'starting' | 'ending' | 'idle' | undefined;

export enum TransitionStatusDataAttributes {
  /**
   * Present when the component begins animating in.
   */
  startingStyle = 'data-starting-style',
  /**
   * Present when the component is animating out.
   */
  endingStyle = 'data-ending-style',
}

const STARTING_HOOK = { 'data-starting-style': '' };
const ENDING_HOOK = { 'data-ending-style': '' };

export const transitionStatusMapping = {
  transitionStatus(value): Record<string, string> | null {
    if (value === 'starting') {
      return STARTING_HOOK;
    }
    if (value === 'ending') {
      return ENDING_HOOK;
    }
    return null;
  },
} satisfies StateAttributesMapping<{ transitionStatus: TransitionStatus }>;
