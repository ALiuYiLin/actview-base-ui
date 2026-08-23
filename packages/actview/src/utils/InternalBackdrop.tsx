import { defineComponent } from 'actview';

/**
 * @internal
 */
export const InternalBackdrop = defineComponent(function InternalBackdrop(
  props: InternalBackdrop.Props,
) {
  return () => {
    const {cutout, inert, ...otherProps} = props as any;

    let clipPath: string | undefined;
    if (cutout) {
      const rect = cutout.getBoundingClientRect();
      clipPath = `polygon(0% 0%,100% 0%,100% 100%,0% 100%,0% 0%,${rect.left}px ${rect.top}px,${rect.left}px ${rect.bottom}px,${rect.right}px ${rect.bottom}px,${rect.right}px ${rect.top}px,${rect.left}px ${rect.top}px)`;
    }

    const style: any = {
      position: 'fixed',
      inset: 0,
      userSelect: 'none',
      WebkitUserSelect: 'none',
      clipPath,
      ...(otherProps.style ?? {}),
    };

    if (inert) {
      style.pointerEvents = 'none';
    }

    return (
      <div
        ref={(el: any) => {
          if (typeof props.ref === 'function') {
            props.ref(el);
          } else if (props.ref) {
            props.ref.value = el;
            props.ref.current = el;
          }
        }}
        role="presentation"
        // Ensures Floating UI's outside press detection runs, as it considers
        // it an element that existed when the popup rendered.
        data-base-ui-inert=""
        {...otherProps}
        style={style}
      />
    );
  };
});

export interface InternalBackdropState {}

export interface InternalBackdropProps {
  /**
   * The element to cut out of the backdrop.
   */
  cutout?: Element | null | undefined;
  inert?: boolean | undefined;
  style?: any;
  ref?: any;
  [key: string]: any;
}

export namespace InternalBackdrop {
  export type State = InternalBackdropState;
  export type Props = InternalBackdropProps;
}
