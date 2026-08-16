import type { Orientation } from '../../internals/types';
import { Separator, type SeparatorState } from '../../separator';
import { useToolbarRootContext } from '../root/ToolbarRootContext';

/**
 * A separator element accessible to screen readers.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarSeparator(componentProps: ToolbarSeparator.Props) {
  const rootContext = useToolbarRootContext();

  const getOrientation = () => {
    const toolbarOrientation = rootContext.value.orientation;
    return (
      componentProps.orientation ??
      (toolbarOrientation === 'vertical' ? 'horizontal' : 'vertical')
    );
  };

  return (
    <Separator
      {...componentProps}
      orientation={getOrientation()}
      className={componentProps.className as any}
      style={componentProps.style as any}
    />
  );
}

export interface ToolbarSeparatorState extends SeparatorState {}

export interface ToolbarSeparatorProps extends Separator.Props {
  /**
   * The orientation of the separator. Defaults to the opposite of the toolbar's
   * orientation, so a horizontal toolbar renders vertical separators.
   */
  orientation?: Orientation | undefined;
}

export namespace ToolbarSeparator {
  export type State = ToolbarSeparatorState;
  export type Props = ToolbarSeparatorProps;
}
