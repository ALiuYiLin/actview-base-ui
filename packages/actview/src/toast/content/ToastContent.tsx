import { computed, ref, watch } from 'actview';
import type { BaseUIComponentProps } from '../../internals/types';
import { useToastRootContext } from '../root/ToastRootContext';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * A container for the contents of a toast.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastContent(componentProps: ToastContent.Props) {
  const {
    render: _render,
    className: _className,
    style: _style,
    ...elementProps
  } = componentProps;

  const { recalculateHeight } = useToastRootContext().value!;
  const context = useToastRootContext();

  const contentRef = ref<HTMLDivElement | null>(null);

  watch(
    () => contentRef.value,
    (node, _old, onCleanup) => {
      recalculateHeight();

      if (!node || typeof ResizeObserver !== 'function' || typeof MutationObserver !== 'function') {
        return;
      }

      const resizeObserver = new ResizeObserver(() => recalculateHeight(true));
      const mutationObserver = new MutationObserver(() => recalculateHeight(true));

      resizeObserver.observe(node);
      mutationObserver.observe(node, { childList: true, subtree: true, characterData: true });

      onCleanup(() => {
        resizeObserver.disconnect();
        mutationObserver.disconnect();
      });
    },
    { immediate: true },
  );

  const behind = computed(() => context.value.visibleIndex > 0);

  const state = computed<ToastContentState>(() => ({
    expanded: context.value.expanded,
    behind: behind.value,
  }));

  const getElement = useRenderElement('div', componentProps, {
    ref: [componentProps.ref, contentRef],
    state,
    props: elementProps,
  });

  return <>{getElement()}</>;
}

export interface ToastContentState {
  /**
   * Whether the toast viewport is expanded.
   */
  expanded: boolean;
  /**
   * Whether the toast is behind the frontmost toast in the stack.
   */
  behind: boolean;
}

export interface ToastContentProps extends BaseUIComponentProps<'div', ToastContentState> {}

export namespace ToastContent {
  export type State = ToastContentState;
  export type Props = ToastContentProps;
}
