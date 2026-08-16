const visuallyHiddenBase: Record<string, string | number> = {
  clipPath: 'inset(50%)',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  border: 0,
  padding: 0,
  width: 1,
  height: 1,
  margin: -1,
};

export const visuallyHidden: Record<string, string | number> = {
  ...visuallyHiddenBase,
  position: 'fixed',
  top: 0,
  left: 0,
};

export const visuallyHiddenInput: Record<string, string | number> = {
  ...visuallyHiddenBase,
  position: 'absolute',
};
