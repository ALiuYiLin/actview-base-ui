import { isHTMLElement } from '@floating-ui/utils/dom';
import { ownerDocument } from '@base-ui/actview-utils/owner';
import { computed } from 'actview';
import { getTarget } from '@base-ui/actview-utils/shadowDom';
import { useRegisteredLabelId } from '@/utils/useRegisteredLabelId';
import { useLabelableContext } from '@/internals/labelable-provider/LabelableContext';
import type { HTMLProps } from '@/internals/types';

export function useLabel(params: UseLabelParameters = {}): () => UseLabelReturnValue {
  const {
    id: idProp,
    fallbackControlId,
    native = false,
    setLabelId: setLabelIdProp,
    focusControl: focusControlProp,
  } = params;

  const labelableContext = useLabelableContext();

  const syncLabelId = (
    nextLabelId: string | undefined | ((current: string | undefined) => string | undefined),
  ) => {
    labelableContext.value.setLabelId(nextLabelId);
    // 函数式注销不向外转发（setLabelIdProp 是普通写入）
    if (typeof nextLabelId !== 'function') {
      setLabelIdProp?.(nextLabelId);
    }
  };

  const id = useRegisteredLabelId(idProp, syncLabelId);

  const resolvedControlId = computed(
    () => labelableContext.value.controlId ?? fallbackControlId,
  );

  function focusControl(event: MouseEvent) {
    if (focusControlProp) {
      focusControlProp(event, resolvedControlId.value);
      return;
    }

    if (!resolvedControlId.value) {
      return;
    }

    const controlElement = ownerDocument(event.currentTarget as Element).getElementById(
      resolvedControlId.value,
    );
    if (isHTMLElement(controlElement)) {
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

  return () =>
    native
      ? {
          // useRegisteredLabelId 响应式改造后返回 Ref<string | undefined>——
          // 渲染期解包 .value（否则 label 的 id attribute 被 setAttribute 序列化成
          // '[object Object]'，FieldsetLegend 同款适配见案例 15）
          id: id.value,
          // ActView does not map `htmlFor` to the HTML `for` attribute (only `className` is
          // mapped), so the raw attribute name must be used (plantform-diff.md AD-24).
          for: resolvedControlId.value,
          onMouseDown: handleInteraction,
        }
      : {
          id: id.value,
          onClick: handleInteraction,
          onPointerDown(event: PointerEvent) {
            event.preventDefault();
          },
        };
}

export interface UseLabelParameters {
  id?: string | undefined;
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
  setLabelId?: ((id: string | undefined) => void) | undefined;
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
