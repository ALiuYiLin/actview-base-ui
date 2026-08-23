function isShadowRoot(node: Node): node is ShadowRoot {
  return 'host' in node;
}

export function activeElement(doc: Document) {
  let element = doc.activeElement;

  while (element?.shadowRoot?.activeElement != null) {
    element = element.shadowRoot.activeElement;
  }

  return element;
}

export function contains(parent?: Element | null, child?: Element | null) {
  if (!parent || !child) {
    return false;
  }

  const rootNode = child.getRootNode?.();

  // First, attempt with the faster native method.
  if (parent.contains(child)) {
    return true;
  }

  // Then fall back to traversing out of shadow roots when needed.
  if (rootNode && isShadowRoot(rootNode)) {
    let next: Node | null = child;
    while (next) {
      if (parent === next) {
        return true;
      }
      next = next.parentNode || (next as unknown as ShadowRoot).host || null;
    }
  }

  return false;
}

export function getTarget(event: any) {
  if ('composedPath' in event) {
    return event.composedPath()[0];
  }

  return event.target;
}
