type Empty = null | undefined;
type RefCallback<I> = (instance: I | null) => void | (() => void);
type InputRef<I> = RefCallback<I> | { current?: I | null; value?: I | null } | Empty;
type Result<I> = ((instance: I | null) => void) | null;
type Cleanup = () => void;

type ForkRef<I> = {
  callback: ((instance: I | null) => void) | null;
  cleanup: Cleanup | null;
  refs: InputRef<I>[];
};

/**
 * Merges refs into a single memoized callback ref or `null`.
 * This makes sure multiple refs are updated together and have the same value.
 *
 * This function accepts up to four refs. If you need to merge more, or have an unspecified number of refs to merge,
 * use `useMergedRefsN` instead.
 */
export function useMergedRefs<I>(a: InputRef<I>, b: InputRef<I>): Result<I>;
export function useMergedRefs<I>(a: InputRef<I>, b: InputRef<I>, c: InputRef<I>): Result<I>;
export function useMergedRefs<I>(
  a: InputRef<I>,
  b: InputRef<I>,
  c: InputRef<I>,
  d: InputRef<I>,
): Result<I>;
export function useMergedRefs<I>(
  a: InputRef<I>,
  b: InputRef<I>,
  c?: InputRef<I>,
  d?: InputRef<I>,
): Result<I> {
  const forkRef = createForkRef<I>();
  if (didChange(forkRef, a, b, c, d)) {
    update(forkRef, [a, b, c, d]);
  }
  return forkRef.callback;
}

/**
 * Merges an array of refs into a single memoized callback ref or `null`.
 *
 * If you need to merge a fixed number (up to four) of refs, use `useMergedRefs` instead for better performance.
 */
export function useMergedRefsN<I>(refs: InputRef<I>[]): Result<I> {
  const forkRef = createForkRef<I>();
  if (didChangeN(forkRef, refs)) {
    update(forkRef, refs);
  }
  return forkRef.callback;
}

/**
 * Merges an array of refs into a single callback ref or `null`.
 *
 * This is the non-hook variant of `useMergedRefsN`: it creates the fork on every call and can
 * be used anywhere (including inside a render function), without relying on setup-only state.
 */
export function mergeRefsN<I>(refs: InputRef<I>[]): Result<I> {
  const forkRef = createForkRef<I>();
  update(forkRef, refs);
  return forkRef.callback;
}

/**
 * Merges up to four refs into a single callback ref or `null`.
 *
 * This is the non-hook variant of `useMergedRefs`: it creates the fork on every call and can
 * be used anywhere (including inside a render function), without relying on setup-only state.
 * If you need to merge more refs, use `mergeRefsN` instead.
 */
export function mergeRefs<I>(a: InputRef<I>, b: InputRef<I>): Result<I>;
export function mergeRefs<I>(a: InputRef<I>, b: InputRef<I>, c: InputRef<I>): Result<I>;
export function mergeRefs<I>(
  a: InputRef<I>,
  b: InputRef<I>,
  c: InputRef<I>,
  d: InputRef<I>,
): Result<I>;
export function mergeRefs<I>(
  a: InputRef<I>,
  b: InputRef<I>,
  c?: InputRef<I>,
  d?: InputRef<I>,
): Result<I> {
  const forkRef = createForkRef<I>();
  update(forkRef, [a, b, c, d]);
  return forkRef.callback;
}

function createForkRef<I>(): ForkRef<I> {
  return {
    callback: null,
    cleanup: null as Cleanup | null,
    refs: [],
  };
}

function didChange<I>(
  forkRef: ForkRef<I>,
  a: InputRef<I>,
  b: InputRef<I>,
  c: InputRef<I>,
  d: InputRef<I>,
) {
  // prettier-ignore
  return (
    forkRef.refs[0] !== a ||
    forkRef.refs[1] !== b ||
    forkRef.refs[2] !== c ||
    forkRef.refs[3] !== d
  )
}

function didChangeN<I>(forkRef: ForkRef<I>, newRefs: InputRef<I>[]) {
  return (
    forkRef.refs.length !== newRefs.length ||
    forkRef.refs.some((ref, index) => ref !== newRefs[index])
  );
}

function update<I>(forkRef: ForkRef<I>, refs: InputRef<I>[]) {
  forkRef.refs = refs;

  if (refs.every((ref) => ref == null)) {
    forkRef.callback = null;
    return;
  }

  forkRef.callback = (instance: I | null) => {
    if (forkRef.cleanup) {
      forkRef.cleanup();
      forkRef.cleanup = null;
    }

    if (instance != null) {
      const cleanupCallbacks = Array(refs.length).fill(null) as Array<Cleanup | null>;

      for (let i = 0; i < refs.length; i += 1) {
        const ref = refs[i];
        if (ref == null) {
          continue;
        }
        switch (typeof ref) {
          case 'function': {
            const refCleanup = ref(instance);
            if (typeof refCleanup === 'function') {
              cleanupCallbacks[i] = refCleanup;
            }
            break;
          }
          case 'object': {
            if ('current' in ref) {
              ref.current = instance;
            } else if ('value' in ref) {
              ref.value = instance;
            }
            break;
          }
          default:
        }
      }

      forkRef.cleanup = () => {
        for (let i = 0; i < refs.length; i += 1) {
          const ref = refs[i];
          if (ref == null) {
            continue;
          }
          switch (typeof ref) {
            case 'function': {
              const cleanupCallback = cleanupCallbacks[i];
              if (typeof cleanupCallback === 'function') {
                cleanupCallback();
              } else {
                // Legacy ref with no attach-time cleanup: detach by calling it with `null`.
                // It returns nothing; React 19 cleanups are handled in the branch above.
                void ref(null);
              }
              break;
            }
            case 'object': {
              if ('current' in ref) {
                ref.current = null;
              } else if ('value' in ref) {
                ref.value = null;
              }
              break;
            }
            default:
          }
        }
      };
    }
  };
}
