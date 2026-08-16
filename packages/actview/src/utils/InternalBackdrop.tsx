import type { HTMLProps } from '../internals/types';

/**
 * @internal
 */
export function InternalBackdrop(props: InternalBackdrop.Props) {
  const getElementProps = () => {
    const { cutout, ...otherProps } = props;

    let clipPath: string | undefined;
    if (cutout) {
      const rect = cutout.getBoundingClientRect();
      clipPath = `polygon(0% 0%,100% 0%,100% 100%,0% 100%,0% 0%,${rect.left}px ${rect.top}px,${rect.left}px ${rect.bottom}px,${rect.right}px ${rect.bottom}px,${rect.right}px ${rect.top}px,${rect.left}px ${rect.top}px)`;
    }

    return {
      ...otherProps,
      style: {
        position: 'fixed',
        inset: 0,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        ...(clipPath !== undefined ? { clipPath } : null),
      },
    };
  };

  return (
    <div
      role="presentation"
      // Ensures Floating UI's outside press detection runs, as it considers
      // it an element that existed when the popup rendered.
      data-base-ui-inert=""
      {...(getElementProps() as JSX.IntrinsicElements['div'])}
    />
  );
}

export interface InternalBackdropState {}

export interface InternalBackdropProps extends HTMLProps<HTMLDivElement> {
  /**
   * The element to cut out of the backdrop.
   * This is useful for allowing certain elements to be interactive while the backdrop is present.
   */
  cutout?: Element | null | undefined;
}

export namespace InternalBackdrop {
  export type State = InternalBackdropState;
  export type Props = InternalBackdropProps;
}
