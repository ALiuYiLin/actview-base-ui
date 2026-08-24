import {ref} from 'actview';
export type InteractionType = 'mouse' | 'touch' | 'pen' | 'keyboard' | '';

/**
 * Provides a cross-browser way to determine the type of the pointer used to click.
 * Safari and Firefox do not provide the PointerEvent to the click handler (they use MouseEvent) yet.
 * Additionally, this implementation detects if the click was triggered by the keyboard.
 * (actview 版：React useRef/useCallback → 稳定对象引用。)
 */
export function useEnhancedClickHandler(
  handler: (event: any, interactionType: InteractionType) => void,
) {
  const lastClickInteractionTypeRef = ref('' as InteractionType);

  const handlePointerDown = (event: any) => {
    if (event.defaultPrevented) {
      return;
    }

    lastClickInteractionTypeRef.value = event.pointerType as InteractionType;
    handler(event, event.pointerType as InteractionType);
  };

  const handleClick = (event: any) => {
    // event.detail has the number of clicks performed on the element. 0 means it was triggered by the keyboard.
    if ((event.detail ?? 0) === 0) {
      handler(event, 'keyboard');
      return;
    }

    if ('pointerType' in event) {
      // Chrome and Edge correctly use PointerEvent
      handler(event, event.pointerType);
    } else {
      handler(event, lastClickInteractionTypeRef.value);
    }
    lastClickInteractionTypeRef.value = '';
  };

  return {onClick: handleClick, onPointerDown: handlePointerDown};
}
