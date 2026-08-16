import { computed, ref, unref } from 'actview';
import type { ComputedRef } from '@actview/core';
import { useIsoLayoutEffect } from '@base-ui/actview-utils/useIsoLayoutEffect';
import { useBaseUiId } from '../useBaseUiId';
import type { MaybeRef, RefObject } from '../types';

export function useAriaLabelledBy(
  explicitAriaLabelledBy: MaybeRef<string | undefined>,
  labelId: MaybeRef<string | undefined>,
  labelSourceRef: RefObject<LabelSource | null>,
  enableFallback: MaybeRef<boolean> = true,
  labelSourceId?: string,
): ComputedRef<string | undefined> {
  const fallbackAriaLabelledBy = ref<string | undefined>(undefined);

  const generatedLabelId = useBaseUiId(labelSourceId ? `${labelSourceId}-label` : undefined);

  // Fallback for <span> controls labelled by wrapping/sibling native <label>.
  // Run after every commit so DOM association changes (e.g. label mount/unmount)
  // are reflected even when props/state deps are unchanged.
  useIsoLayoutEffect(() => {
    const nextAriaLabelledBy =
      unref(explicitAriaLabelledBy) || unref(labelId) || !unref(enableFallback)
        ? undefined
        : getAriaLabelledBy(labelSourceRef.current, generatedLabelId);

    if (fallbackAriaLabelledBy.value !== nextAriaLabelledBy) {
      fallbackAriaLabelledBy.value = nextAriaLabelledBy;
    }
  });

  return computed(
    () => unref(explicitAriaLabelledBy) ?? unref(labelId) ?? fallbackAriaLabelledBy.value,
  );
}

function getAriaLabelledBy(labelSource?: LabelSource | null, generatedLabelId?: string) {
  const label = findAssociatedLabel(labelSource);
  if (!label) {
    return undefined;
  }

  if (!label.id && generatedLabelId) {
    label.id = generatedLabelId;
  }

  return label.id || undefined;
}

function findAssociatedLabel(labelSource?: LabelSource | null) {
  if (!labelSource) {
    return undefined;
  }

  // Fast path before the expensive `.labels` read.
  const parent = labelSource.parentElement;
  if (parent && parent.tagName === 'LABEL') {
    return parent as HTMLLabelElement;
  }

  const controlId = labelSource.id;
  if (controlId) {
    const nextSibling = labelSource.nextElementSibling as HTMLLabelElement | null;
    if (nextSibling && nextSibling.htmlFor === controlId) {
      return nextSibling;
    }
  }

  const labels = labelSource.labels;
  return labels && labels[0];
}

type LabelSource = HTMLElement & { labels?: NodeListOf<HTMLLabelElement> | null | undefined };
