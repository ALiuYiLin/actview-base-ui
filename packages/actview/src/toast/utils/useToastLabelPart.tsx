import { watch } from 'actview';
import type { VNode, VNodeChild } from '@actview/jsx';
import { useId } from '@base-ui/actview-utils/useId';
import { useToastRootContext, type ToastLabelIdSetter } from '../root/ToastRootContext';
import { isRenderableNode } from './isRenderableNode';

/**
 * Shared logic for `Toast.Title` and `Toast.Description`, which only differ by the rendered tag,
 * the fallback content, and which id setter they register with. Resolves the content and returns
 * the pieces each part passes to `useRenderElement` and `useToastLabelElement`.
 *
 * `getChildren` and the returned `resolveChildren` are evaluated on every render (never in
 * setup) so the resolved content stays reactive — the store swaps in new toast objects on
 * updates (PD-15).
 */
export function useToastLabelPart(
  idProp: string | undefined,
  getChildren: () => VNodeChild,
  part: 'title' | 'description',
) {
  const context = useToastRootContext();

  const setId = part === 'title' ? context.value.setTitleId : context.value.setDescriptionId;
  const id = useId(idProp);

  const resolveChildren = () =>
    getChildren() ?? (part === 'title' ? context.value.toast.title : context.value.toast.description);

  return { id, resolveChildren, setId, context };
}

/**
 * Registers the generated id with the root only while the part actually carries
 * renderable content, and renders the evaluated label element conditionally on that
 * same check (a `render` prop's own children count, while a childless styling-only
 * `render` stays conditional).
 */
export function useToastLabelElement(
  getElement: () => VNode | null,
  shouldRender: () => boolean,
  id: string | undefined,
  setId: ToastLabelIdSetter,
): VNode {
  watch(
    shouldRender,
    (render, _old, onCleanup) => {
      if (!render) {
        return;
      }

      setId(id);
      onCleanup(() => {
        setId((currentId) => (currentId === id ? undefined : currentId));
      });
    },
    { immediate: true },
  );

  return (
    <>
      {(() => {
        const element = getElement();
        return shouldRender() ? element : null;
      })()}
    </>
  );
}
