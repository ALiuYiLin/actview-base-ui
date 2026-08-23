export function ownerDocument(node: Element | null | undefined): Document {
  return (node && node.ownerDocument) || document;
}

export function ownerWindow(node: Element | null | undefined): Window & typeof globalThis {
  const doc = ownerDocument(node);
  return doc.defaultView || window;
}
