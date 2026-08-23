import { defineComponent } from 'actview';

const visuallyHiddenStyle = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: '0',
  border: '0',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
} as const;

/**
 * @internal
 */
export const FocusGuard = defineComponent(function FocusGuard(props: any) {
  const {children, ...restProps} = props;

  const merged = {
    tabIndex: 0,
    ...restProps,
    style: visuallyHiddenStyle,
    'aria-hidden': true,
    'data-base-ui-focus-guard': '',
  };

  return () => <span {...merged}>{children}</span>;
});
