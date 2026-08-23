/**
 * A testing-library-style `fireEvent` facade over native DOM events, used by the ported
 * tests. ActView listens to native DOM events, so each helper constructs the appropriate
 * native event and dispatches it on the target.
 */

export interface FireEventInit {
  bubbles?: boolean;
  cancelable?: boolean;
  [key: string]: unknown;
}

type Target = Element | null;

function dispatch(target: Target, event: Event) {
  if (!target) {
    throw new Error('Base UI test utils: fireEvent target is null.');
  }
  target.dispatchEvent(event);
  // testing-library 契约：fireEvent 返回 `!defaultPrevented`（preventDefault 被
  // 调用时返回 false）。React 版测试断言该返回值（如页面滚动被阻止的用例）。
  return !event.defaultPrevented;
}

function assignEventProperties(event: any, init: FireEventInit = {}) {
  const { bubbles = true, cancelable = true, ...rest } = init;
  for (const key of Object.keys(rest)) {
    if (key !== 'target' && key !== 'currentTarget') {
      try {
        event[key] = rest[key];
      } catch {
        // Some properties are read-only on certain event subclasses; ignore.
      }
    }
  }
  return { bubbles, cancelable };
}

function mouse(target: Target, type: string, init: MouseEventInit = {}) {
  const { bubbles = true, cancelable = true, ...rest } = init;
  dispatch(target, new MouseEvent(type, { bubbles, cancelable, ...rest }));
}

function pointer(target: Target, type: string, init: PointerEventInit = {}) {
  const { bubbles = true, cancelable = true, ...rest } = init;
  dispatch(target, new PointerEvent(type, { bubbles, cancelable, ...rest }));
}

function keyboard(target: Target, type: string, init: KeyboardEventInit = {}) {
  const { bubbles = true, cancelable = true, ...rest } = init;
  dispatch(target, new KeyboardEvent(type, { bubbles, cancelable, ...rest }));
}

function focusish(target: Target, type: string, init: FocusEventInit = {}) {
  const { bubbles = false, cancelable = false, ...rest } = init;
  dispatch(target, new FocusEvent(type, { bubbles, cancelable, ...rest }));
}

export interface InputFireEventInit extends InputEventInit {
  target?: { value?: string };
}

/** Sets the input value before dispatching, like testing-library does. */
function input(target: Target, type: string, init: InputFireEventInit = {}) {
  const { bubbles = true, cancelable = false, target: targetInit, ...rest } = init;
  if (targetInit?.value !== undefined && target instanceof HTMLInputElement) {
    target.value = targetInit.value;
  }
  dispatch(target, new InputEvent(type, { bubbles, cancelable, ...rest }));
}

export const fireEvent = {
  click: (t: Target, i?: MouseEventInit) => mouse(t, 'click', i),
  dblClick: (t: Target, i?: MouseEventInit) => mouse(t, 'dblclick', i),
  contextMenu: (t: Target, i?: MouseEventInit) => mouse(t, 'contextmenu', i),
  mouseDown: (t: Target, i?: MouseEventInit) => mouse(t, 'mousedown', i),
  mouseUp: (t: Target, i?: MouseEventInit) => mouse(t, 'mouseup', i),
  mouseEnter: (t: Target, i?: MouseEventInit) => mouse(t, 'mouseenter', { ...i, bubbles: false }),
  mouseLeave: (t: Target, i?: MouseEventInit) => mouse(t, 'mouseleave', { ...i, bubbles: false }),
  mouseMove: (t: Target, i?: MouseEventInit) => mouse(t, 'mousemove', i),
  mouseOver: (t: Target, i?: MouseEventInit) => mouse(t, 'mouseover', i),
  mouseOut: (t: Target, i?: MouseEventInit) => mouse(t, 'mouseout', i),
  pointerDown: (t: Target, i?: PointerEventInit) => pointer(t, 'pointerdown', i),
  pointerUp: (t: Target, i?: PointerEventInit) => pointer(t, 'pointerup', i),
  pointerMove: (t: Target, i?: PointerEventInit) => pointer(t, 'pointermove', i),
  pointerEnter: (t: Target, i?: PointerEventInit) =>
    pointer(t, 'pointerenter', { ...i, bubbles: false }),
  pointerLeave: (t: Target, i?: PointerEventInit) =>
    pointer(t, 'pointerleave', { ...i, bubbles: false }),
  pointerOver: (t: Target, i?: PointerEventInit) => pointer(t, 'pointerover', i),
  pointerOut: (t: Target, i?: PointerEventInit) => pointer(t, 'pointerout', i),
  pointerCancel: (t: Target, i?: PointerEventInit) => pointer(t, 'pointercancel', i),
  gotPointerCapture: (t: Target, i?: PointerEventInit) => pointer(t, 'gotpointercapture', i),
  lostPointerCapture: (t: Target, i?: PointerEventInit) => pointer(t, 'lostpointercapture', i),
  keyDown: (t: Target, i?: KeyboardEventInit) => keyboard(t, 'keydown', i),
  keyUp: (t: Target, i?: KeyboardEventInit) => keyboard(t, 'keyup', i),
  keyPress: (t: Target, i?: KeyboardEventInit) => keyboard(t, 'keypress', i),
  input: (t: Target, i?: InputFireEventInit) => input(t, 'input', i),
  change: (t: Target, i?: FireEventInit) => {
    const { bubbles = true, cancelable = false, ...rest } = i ?? {};
    dispatch(t, new Event('change', { bubbles, cancelable, ...rest }));
  },
  focus: (t: Target, i?: FocusEventInit) => focusish(t, 'focus', i),
  blur: (t: Target, i?: FocusEventInit) => focusish(t, 'blur', i),
  focusIn: (t: Target, i?: FocusEventInit) => focusish(t, 'focusin', i),
  focusOut: (t: Target, i?: FocusEventInit) => focusish(t, 'focusout', i),
  submit: (t: Target, i?: FireEventInit) => {
    const { bubbles = true, cancelable = true, ...rest } = i ?? {};
    dispatch(t, new Event('submit', { bubbles, cancelable, ...rest }));
  },
  touchStart: (t: Target, i?: TouchEventInit) => dispatch(t, new TouchEvent('touchstart', i)),
  touchEnd: (t: Target, i?: TouchEventInit) => dispatch(t, new TouchEvent('touchend', i)),
  touchMove: (t: Target, i?: TouchEventInit) => dispatch(t, new TouchEvent('touchmove', i)),
  wheel: (t: Target, i?: WheelEventInit) => dispatch(t, new WheelEvent('wheel', i)),
  scroll: (t: Target, i?: FireEventInit) => dispatch(t, new Event('scroll', i)),
  dragStart: (t: Target, i?: DragEventInit) => dispatch(t, new DragEvent('dragstart', i)),
  dragEnd: (t: Target, i?: DragEventInit) => dispatch(t, new DragEvent('dragend', i)),
  dragOver: (t: Target, i?: DragEventInit) => dispatch(t, new DragEvent('dragover', i)),
  drop: (t: Target, i?: DragEventInit) => dispatch(t, new DragEvent('drop', i)),
  paste: (t: Target, i?: ClipboardEventInit) => dispatch(t, new ClipboardEvent('paste', i)),
  animationEnd: (t: Target, i?: AnimationEventInit) =>
    dispatch(t, new AnimationEvent('animationend', i)),
  transitionEnd: (t: Target, i?: TransitionEventInit) =>
    dispatch(t, new TransitionEvent('transitionend', i)),
};
