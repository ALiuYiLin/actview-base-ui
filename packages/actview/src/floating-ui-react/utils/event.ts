export function isClickLikeEvent(event: Event | {type: string}) {
  const type = event.type;
  return type === 'click' || type === 'mousedown' || type === 'keydown' || type === 'keyup';
}

export function stopEvent(event: Event | {preventDefault(): void; stopPropagation(): void}) {
  event.preventDefault();
  event.stopPropagation();
}
