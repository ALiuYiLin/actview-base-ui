export function ownerDocument(node: Element | null) {
  return node?.ownerDocument || document;
}

export function ownerWindow(node: Element | null) {
  return ownerDocument(node).defaultView || window;
}
