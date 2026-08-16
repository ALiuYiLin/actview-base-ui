import { unref } from 'actview';
import type { Ref } from '@actview/core';
import { popupStateMapping } from './popupStateMapping';
import {
  useRenderElement,
  type UseRenderElementComponentProps,
} from '../internals/useRenderElement';
import { getDisabledMountTransitionStyles } from '../internals/getDisabledMountTransitionStyles';
import type { TransitionStatus } from '../internals/useTransitionStatus';
import type { HTMLProps, RefValue } from '../internals/types';

type MaybeRef<T> = T | Ref<T>;

interface UsePositionerOptions {
  styles: MaybeRef<Record<string, string | number>>;
  transitionStatus: MaybeRef<TransitionStatus>;
  props?: HTMLProps | undefined;
  refs?: RefValue<HTMLDivElement> | (RefValue<HTMLDivElement> | undefined)[] | undefined;
  hidden?: MaybeRef<boolean | undefined> | undefined;
  inert?: MaybeRef<boolean | undefined> | undefined;
}

/**
 * Renders the shared outer Positioner element used by popup components.
 * Applies the common role, hidden state, transition styles, state attributes, and optional inert styling.
 */
export function usePositioner<State extends Record<string, any>>(
  componentProps: UseRenderElementComponentProps<State>,
  state: State | Ref<State>,
  { styles, transitionStatus, props, refs, hidden, inert = false }: UsePositionerOptions,
) {
  return useRenderElement('div', componentProps, {
    state,
    ref: refs,
    props: [
      () => {
        const style: Record<string, string | number> = { ...unref(styles) };

        if (unref(inert)) {
          style.pointerEvents = 'none';
        }

        return { role: 'presentation', hidden: unref(hidden), style };
      },
      () => getDisabledMountTransitionStyles(unref(transitionStatus)),
      props,
    ],
    stateAttributesMapping: popupStateMapping,
  });
}
