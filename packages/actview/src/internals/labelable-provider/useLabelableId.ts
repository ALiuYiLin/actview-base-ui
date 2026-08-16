import { computed, onUnmounted, unref, watch } from 'actview';
import type { ComputedRef } from '@actview/core';
import { useRefWithInit } from '@base-ui/actview-utils/useRefWithInit';
import { NOOP } from '../noop';
import { useBaseUiId } from '../useBaseUiId';
import { useLabelableContext } from './LabelableContext';
import type { MaybeRef } from '../types';

export function useLabelableId(
  params: UseLabelableIdParameters = {},
): ComputedRef<string | null | undefined> {
  const { id, enabled = true } = params;

  const labelableContext = useLabelableContext();

  // Deliberately not seeded with `id`: on React 17 the seed would stick around after the
  // `id` prop is removed, leaving the control on a stale id forever.
  const defaultId = useBaseUiId();

  const controlSourceRef = useRefWithInit(() => Symbol());
  let hasRegistered = false;
  let hadExplicitId = false;

  const unregisterControlId = () => {
    if (!hasRegistered || labelableContext.value.registerControlId === NOOP) {
      return;
    }

    hasRegistered = false;
    labelableContext.value.registerControlId(controlSourceRef.current, undefined);
  };

  watch(
    [() => unref(id), () => unref(enabled)],
    () => {
      const enabledValue = unref(enabled);
      const registerControlId = labelableContext.value.registerControlId;

      if (!enabledValue || registerControlId === NOOP) {
        unregisterControlId();
        return;
      }

      let nextId: string | null | undefined;

      const idValue = unref(id);
      if (idValue !== undefined) {
        hadExplicitId = true;
        nextId = idValue;
      } else if (hadExplicitId) {
        nextId = defaultId;
      } else {
        // An id-less replacement must claim the provider's fallback so a previously registered
        // explicit id is not retained after its control unmounts.
        labelableContext.value.resetControlId();
        return;
      }

      // Either the control never had an explicit `id`, or React 17 has not assigned the
      // fallback id yet. Neither is worth registering.
      if (nextId === undefined) {
        unregisterControlId();
        return;
      }

      hasRegistered = true;
      registerControlId(controlSourceRef.current, nextId);
    },
    { immediate: true },
  );

  // Unregistering in the layout phase, not a passive effect: a replacement control's layout
  // effect would otherwise run first and still see the outgoing control's registration.
  onUnmounted(unregisterControlId);

  // The provider's id wins until registration runs: the label renders `htmlFor` from the
  // provider's pre-registration state, so preempting it with an explicit `id` here would
  // leave the pair unassociated in server-rendered markup.
  return computed(
    () => (unref(enabled) ? labelableContext.value.controlId : undefined) ?? unref(id) ?? defaultId,
  );
}

export interface UseLabelableIdParameters {
  /**
   * The control's `id`. Pass `null` for a control that takes its name from `aria-labelledby`
   * instead, so that the label omits `htmlFor`.
   */
  id?: MaybeRef<string | null | undefined>;
  /**
   * Whether the control owns the label association of its labelable scope.
   * @default true
   */
  enabled?: MaybeRef<boolean> | undefined;
}

export type UseLabelableIdReturnValue = ComputedRef<string | null | undefined>;

export interface UseLabelableIdState {}
