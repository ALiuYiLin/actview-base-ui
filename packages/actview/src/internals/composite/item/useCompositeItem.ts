import {toValue, ref as refState} from 'actview';
import { CompositeRootContext } from '@/internals/composite/root/CompositeRootContext';
import {
  useCompositeListItem,
  type UseCompositeListItemParameters,
} from '@/internals/composite/list/useCompositeListItem';

export interface UseCompositeItemParameters<Metadata>
  extends Pick<UseCompositeListItemParameters<Metadata>, 'metadata'> {}

export function useCompositeItem<Metadata>(params: UseCompositeItemParameters<Metadata> = {}) {
  // 直接持有 context Ref：render 期 getter 读取最新 highlightedIndex（响应）
  const rootContext = CompositeRootContext.use();
  const {ref, index} = useCompositeListItem(params);

  const itemRef = refState(null as HTMLElement | null);
  const compositeRef = useMergedRefsCallback(ref, (el: HTMLElement | null) => (itemRef.value = el));

  // render 期 getter：highlightedIndex 变化时重新求值（对齐 React 每次 render）
  const compositeProps = (_previousProps?: Record<string, any>) => {
    const contextValue = rootContext.value;
    const isHighlighted = contextValue?.highlightedIndex === index.value;

    return {
      tabIndex: isHighlighted ? 0 : -1,
      onFocus() {
        contextValue?.onHighlightedIndexChange(index.value);
      },
      onMouseMove() {
        const item = itemRef.value;
        if (!contextValue?.highlightItemOnHover || !item) {
          return;
        }

        const disabled = item.hasAttribute('disabled') || item.ariaDisabled === 'true';
        if (!isHighlighted && !disabled) {
          item.focus();
        }
      },
    };
  };

  return {
    compositeProps,
    compositeRef: compositeRef as (element: HTMLElement | null) => void,
    index,
  };
}

function useMergedRefsCallback(
  a: (element: HTMLElement | null) => void,
  b: (element: HTMLElement | null) => void,
): (element: HTMLElement | null) => void {
  return (element: HTMLElement | null) => {
    a(element);
    b(element);
  };
}
