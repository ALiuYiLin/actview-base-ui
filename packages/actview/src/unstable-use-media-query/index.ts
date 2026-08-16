import { ref } from 'actview';
import type { Ref } from '@actview/core';
import { addEventListener } from '@base-ui/actview-utils/addEventListener';

export function useMediaQuery(query: string, options: useMediaQuery.Options): Ref<boolean> {
  // Wait for jsdom to support the match media feature.
  // All the browsers Base UI support have this built-in.
  // This defensive check is here for simplicity.
  // Most of the time, the match media logic isn't central to people's tests.
  const supportMatchMedia =
    typeof window !== 'undefined' && typeof window.matchMedia !== 'undefined';

  query = query.replace(/^@media( ?)/m, '');

  const {
    defaultMatches = false,
    matchMedia = supportMatchMedia ? window.matchMedia : null,
    ssrMatchMedia = null,
    // ActView has no hydration double-pass, so `noSsr` only affects the initial snapshot
    // when rendering server-side via `renderToString`.
    noSsr = false,
  } = options;

  let mediaQueryList: MediaQueryList | null = null;
  let initialMatches = defaultMatches;

  if (matchMedia !== null) {
    mediaQueryList = matchMedia(query);
    initialMatches = mediaQueryList.matches;
  } else if (!noSsr && ssrMatchMedia !== null) {
    initialMatches = ssrMatchMedia(query).matches;
  }

  const match = ref(initialMatches);

  if (mediaQueryList !== null) {
    addEventListener(mediaQueryList, 'change', () => {
      match.value = mediaQueryList!.matches;
    });
  }

  return match;
}

export interface UseMediaQueryOptions {
  /**
   * As `window.matchMedia()` is unavailable on the server,
   * it returns a default matches during the first mount.
   * @default false
   */
  defaultMatches?: boolean | undefined;
  /**
   * You can provide your own implementation of matchMedia.
   * This can be used for handling an iframe content window.
   */
  matchMedia?: typeof window.matchMedia | undefined;
  /**
   * To perform the server-side hydration, the hook needs to render twice.
   * A first time with `defaultMatches`, the value of the server, and a second time with the resolved value.
   * This double pass rendering cycle comes with a drawback: it's slower.
   * You can set this option to `true` if you use the returned value **only** client-side.
   * @default false
   */
  noSsr?: boolean | undefined;
  /**
   * You can provide your own implementation of `matchMedia`, it's used when rendering server-side.
   */
  ssrMatchMedia?: ((query: string) => { matches: boolean }) | undefined;
}

export interface UseMediaQueryState {}

export namespace useMediaQuery {
  export type State = UseMediaQueryState;
  export type Options = UseMediaQueryOptions;
}
