import { computed } from 'actview';
import { useMergedRefs } from '@base-ui/actview-utils/useMergedRefs';
import { useCompositeRootContext } from '../root/CompositeRootContext';
import {
  useCompositeListItem,
  type UseCompositeListItemParameters,
} from '../list/useCompositeListItem';
import type { HTMLProps } from '../../types';

export interface UseCompositeItemParameters<Metadata> extends Pick<
  UseCompositeListItemParameters<Metadata>,
  'metadata'
> {}

export function useCompositeItem<Metadata>(params: UseCompositeItemParameters<Metadata> = {}) {
  const context = useCompositeRootContext();
  const { ref, index } = useCompositeListItem(params);

  const isHighlighted = computed(() => context.value.highlightedIndex === index.value);

  const itemRef = { current: null as HTMLElement | null };
  const mergedRef = useMergedRefs(ref, itemRef);

  const onFocus = () => {
    context.value.onHighlightedIndexChange(index.value);
  };

  const onMouseMove = () => {
    const item = itemRef.current;
    if (!context.value.highlightItemOnHover || !item) {
      return;
    }

    const disabled = item.hasAttribute('disabled') || item.ariaDisabled === 'true';
    if (!isHighlighted.value && !disabled) {
      item.focus();
    }
  };

  // Getter evaluated on every render so `tabIndex` stays reactive.
  const compositeProps = (): HTMLProps => ({
    tabIndex: isHighlighted.value ? 0 : -1,
    onFocus,
    onMouseMove,
  });

  return {
    compositeProps,
    compositeRef: mergedRef as (node: HTMLElement | null) => void,
    index,
  };
}
