import { EMPTY_OBJECT } from '@base-ui/actview-utils/empty';
import { DISABLED_TRANSITIONS_STYLE } from './constants';
import type { TransitionStatus } from './useTransitionStatus';

export function getDisabledMountTransitionStyles(transitionStatus: TransitionStatus): {
  style?: Record<string, string | number> | undefined;
} {
  return transitionStatus === 'starting' ? DISABLED_TRANSITIONS_STYLE : EMPTY_OBJECT;
}
