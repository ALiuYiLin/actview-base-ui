export function getViewportRect(teleportDistance: number | undefined, element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const left = teleportDistance == null ? rect.left : rect.left - teleportDistance;
  const right = teleportDistance == null ? rect.right : rect.right + teleportDistance;
  const top = teleportDistance == null ? rect.top : rect.top - teleportDistance;
  const bottom = teleportDistance == null ? rect.bottom : rect.bottom + teleportDistance;
  return {left, right, top, bottom};
}
