export const GRID_COLUMN_COUNT = 2;

function toArray(children: any): any[] {
  if (children == null) {
    return [];
  }
  return Array.isArray(children) ? children : [children];
}

export function renderGridRows(children: any, grid?: boolean) {
  if (!grid) {
    return children;
  }

  const items = toArray(children);

  return Array.from(
    { length: Math.ceil(items.length / GRID_COLUMN_COUNT) },
    (_row, rowIndex) => (
      <div
        key={rowIndex}
        role="row"
        style={{ display: 'contents' }}
      >
        {items.slice(
          rowIndex * GRID_COLUMN_COUNT,
          rowIndex * GRID_COLUMN_COUNT + GRID_COLUMN_COUNT,
        )}
      </div>
    ),
  );
}
