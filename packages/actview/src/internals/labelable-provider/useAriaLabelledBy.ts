import { ref, watch } from 'actview';
import { useBaseUiId } from '@/internals/useBaseUiId';
import type { Ref } from 'actview';

export function useAriaLabelledBy(
  explicitAriaLabelledBy: string | undefined,
  labelId: string | undefined,
  labelSourceRef: Ref<LabelSource | null>,
  enableFallback = true,
  labelSourceId?: string,
) {
  const fallbackAriaLabelledBy = ref<string | undefined>(undefined);

  const generatedLabelId = useBaseUiId(labelSourceId ? `${labelSourceId}-label` : undefined);
  const ariaLabelledBy = explicitAriaLabelledBy ?? labelId ?? fallbackAriaLabelledBy.value;

  // Fallback for <span> controls labelled by wrapping/sibling native <label>.
  // Run after every commit so DOM association changes (e.g. label mount/unmount)
  // are reflected even when props/state deps are unchanged.
  watch(
    () => [explicitAriaLabelledBy, labelId, labelSourceRef.value] as const,
    () => {
      const nextAriaLabelledBy =
        explicitAriaLabelledBy || labelId || !enableFallback
          ? undefined
          : getAriaLabelledBy(labelSourceRef.value, generatedLabelId);

      if (fallbackAriaLabelledBy.value !== nextAriaLabelledBy) {
        fallbackAriaLabelledBy.value = nextAriaLabelledBy;
      }
    },
    {flush: 'post', immediate: true},
  );

  return ariaLabelledBy;
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

type LabelSource = HTMLElement & {labels?: NodeListOf<HTMLLabelElement> | null | undefined};
