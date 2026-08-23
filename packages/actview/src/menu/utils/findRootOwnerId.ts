/**
 * Finds the id of the root element that owns the given element.
 */
export function findRootOwnerId(element: Element) {
  let current: Element | null = element;

  while (current) {
    const rootOwnerId = current.getAttribute('data-root-owner');
    if (rootOwnerId) {
      return rootOwnerId;
    }

    current = current.parentElement;
  }

  return undefined;
}
