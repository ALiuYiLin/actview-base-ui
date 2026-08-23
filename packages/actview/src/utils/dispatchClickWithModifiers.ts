interface ModifierState {
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

/**
 * Dispatches a constructed click on the target so it carries the source event's
 * modifier state, which `click()` always reports as unpressed. Like `click()`,
 * the untrusted click still runs native activation behavior (form submission,
 * link navigation).
 * `detail` defaults to 0 (the native convention for keyboard-generated clicks);
 * pass `detail: 1` when the click represents a mouse gesture so consumers keying
 * off `detail === 0` don't classify it as a keyboard activation.
 */
export function dispatchClickWithModifiers(
  target: Element,
  sourceEvent: ModifierState,
  { detail = 0 }: { detail?: number | undefined } = {},
) {
  // @base-ui/utils/owner 的 ownerWindow 语义：realm 安全的 window（iframe 内
  // 组件用 iframe 的 window 构造事件）。actview 无该 util 依赖，inline 实现。
  const win = target.ownerDocument?.defaultView ?? window;
  target.dispatchEvent(
    new (win as Window & typeof globalThis).PointerEvent('click', {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail,
      shiftKey: sourceEvent.shiftKey,
      ctrlKey: sourceEvent.ctrlKey,
      altKey: sourceEvent.altKey,
      metaKey: sourceEvent.metaKey,
    }),
  );
}
