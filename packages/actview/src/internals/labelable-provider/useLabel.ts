import { watch } from 'actview';
import type { HTMLProps } from '@/internals/types';
import type { MaybeRefOrGetter } from '@/types';
import { useRegisteredLabelId } from '@/utils/useRegisteredLabelId';
import { useLabelableContext } from './LabelableContext';

export function useLabel(params: UseLabelParameters = {}): UseLabelReturnValue {
  const {id: idProp, fallbackControlId, native = false, setLabelId: setLabelIdProp, focusControl: focusControlProp} =
    params;

  const {controlId: contextControlId, setLabelId: setContextLabelId} = toValueLabelable();

  const syncLabelId = (
    nextLabelId: string | undefined | ((prev: string | undefined) => string | undefined),
  ) => {
    setContextLabelId(nextLabelId);
    setLabelIdProp?.(nextLabelId);
  };

  const id = useRegisteredLabelId(idProp, syncLabelId);

  const resolvedControlId = contextControlId.value ?? fallbackControlId;
  function focusControl(event: MouseEvent) {
    if (focusControlProp) {
      focusControlProp(event, resolvedControlId);
      return;
    }

    if (!resolvedControlId) {
      return;
    }

    const controlElement = ownerDocument(event.currentTarget as Element).getElementById(
      resolvedControlId,
    );
    if (controlElement instanceof HTMLElement) {
      focusElementWithVisible(controlElement);
    }
  }

  function handleInteraction(event: MouseEvent) {
    const target = getTarget(event) as HTMLElement | null;
    if (target?.closest('button,input,select,textarea')) {
      return;
    }

    // Prevent text selection when double clicking label.
    if (!event.defaultPrevented && event.detail > 1) {
      event.preventDefault();
    }

    if (native) {
      return;
    }

    focusControl(event);
  }

  return native
    ? ({
        id: id.value,
        htmlFor: resolvedControlId,
        onMouseDown: handleInteraction,
      } as any)
    : ({
        id: id.value,
        onClick: handleInteraction,
        onPointerDown(event: PointerEvent) {
          event.preventDefault();
        },
      } as any);
}

function toValueLabelable() {
  return useLabelableContext();
}

function getTarget(event: any): Element | null {
  return (event?.target as Element | null) ?? null;
}

function ownerDocument(node: Element | null | undefined): Document {
  return (node && node.ownerDocument) || document;
}

export interface UseLabelParameters {
  /**
   * Label element id；可为 ref/computed（响应式更新，对齐 React 版每次 render 重算）。
   */
  id?: MaybeRefOrGetter<string | undefined> | undefined;
  /**
   * Control id used when no labelable context control id exists.
   */
  fallbackControlId?: string | undefined;
  /**
   * Whether the rendered element is a native `<label>`.
   * @default false
   */
  native?: boolean | undefined;
  /**
   * Additional callback to sync the current label id with local component state/store.
   */
  setLabelId?:
    | ((v: string | undefined | ((prev: string | undefined) => string | undefined)) => void)
    | undefined;
  /**
   * Custom focus handler for non-native labels.
   * If omitted, focus behavior targets the resolved control id.
   */
  focusControl?: ((event: MouseEvent, controlId: string | undefined) => void) | undefined;
}

export type UseLabelReturnValue = HTMLProps;

export function focusElementWithVisible(element: HTMLElement) {
  element.focus({
    // Available from Chrome 144+ (January 2026).
    // Safari and Firefox already support it.
    focusVisible: true,
  });
}
