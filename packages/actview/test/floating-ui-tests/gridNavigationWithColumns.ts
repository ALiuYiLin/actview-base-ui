import { gridNavigation } from '@floating-ui/actview';

export function gridNavigationWithColumns(cols: number): typeof gridNavigation {
  return (
    event,
    prevIndex,
    listRef,
    orientation,
    loop,
    rtl,
    disabledIndices,
    minIndex,
    maxIndex,
  ) =>
    gridNavigation(
      event,
      prevIndex,
      listRef,
      orientation,
      loop,
      rtl,
      disabledIndices,
      minIndex,
      maxIndex,
      cols,
    );
}
