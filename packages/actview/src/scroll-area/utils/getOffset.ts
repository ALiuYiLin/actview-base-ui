export function getOffset(
  element: Element | null,
  prop: 'margin' | 'padding',
  axis: 'x' | 'y',
): number {
  if (!element) {
    return 0;
  }

  const styles = getComputedStyle(element);
  const key = `${prop}${axis === 'x' ? 'Inline' : 'Block'}` as const;
  // `parseFloat('')` is `NaN` (jsdom returns an empty string for unset logical
  // properties), which would poison the thumb-size math downstream; treat it as 0.
  const start = parseFloat(styles[`${key}Start`]) || 0;

  // Safari misreports `marginInlineEnd` in RTL.
  // We have to assume the start/end values are symmetrical, which is likely.
  if (axis === 'x' && prop === 'margin') {
    return start * 2;
  }

  return start + (parseFloat(styles[`${key}End`]) || 0);
}
