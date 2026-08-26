/**
 * Finds the id of the root element that owns the given element.
 * 属性名对齐 React 版与 MenuPopup 的设置：`data-rootownerid`（无连字符）。
 */
export function findRootOwnerId(element: Element) {
  let current: Element | null = element;

  while (current) {
    const rootOwnerId = current.getAttribute('data-rootownerid');
    if (rootOwnerId) {
      return rootOwnerId;
    }

    current = current.parentElement;
  }

  return undefined;
}
