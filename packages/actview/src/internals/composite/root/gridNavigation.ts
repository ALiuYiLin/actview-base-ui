export interface CompositeGridItemSize {
  width: number;
  height: number;
}

export interface CompositeGridConfig {
  cols: number;
  dense?: boolean | undefined;
  itemSizes?: CompositeGridItemSize[] | undefined;
}

export type CompositeGridNavigator = (state: CompositeGridNavigationState) => number;

/**
 * Builds the grid navigation handler passed to `CompositeRoot`/`useCompositeRoot`
 * via the `grid` prop. Importing and calling this is the opt-in for grid
 * navigation: composites that don't pass `grid` never reference the algorithm,
 * so bundlers tree-shake the grid helpers out.
 *
 * (actview 版：grid 导航算法尚未迁移——RadioGroup/Accordion 等现有消费方
 * 均不传 `grid`。传入时抛出明确错误，避免静默失效。)
 */
export function gridNavigation(config: CompositeGridConfig): CompositeGridNavigator {
  void config;
  return () => {
    throw new Error(
      'Base UI: grid navigation is not yet available in @base-ui/actview. ' +
        'Do not pass the `grid` prop to Composite.Root until it is migrated.',
    );
  };
}

export interface CompositeGridNavigationState {
  event: any;
  elementsRef: {current: Array<HTMLElement | null>};
  highlightedIndex: number;
  minIndex: number;
  maxIndex: number;
  orientation: 'horizontal' | 'vertical' | 'both';
  loopFocus: boolean;
  onLoop?: ((event: any, prevIndex: number, nextIndex: number) => number) | undefined;
  disabledIndices?: number[] | undefined;
  rtl: boolean;
}
