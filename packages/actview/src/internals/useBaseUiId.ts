import { useId } from 'actview';
import type { MaybeRefOrGetter } from '../types';
import { toValue } from 'actview';

/**
 * Wraps `useId` and prefixes generated `id`s with `base-ui-`
 * (actview 版：setup 只跑一次，返回普通字符串快照；idOverride 为
 * MaybeRefOrGetter 便于响应 props 变化)。
 * @param idOverride overrides the generated id when provided
 * @returns {string | undefined}
 */
export function useBaseUiId(idOverride?: MaybeRefOrGetter<string | undefined>): string | undefined {
  const override = idOverride == null ? undefined : toValue(idOverride);
  if (override !== undefined) {
    return override;
  }
  return `base-ui-${useId()}`;
}
