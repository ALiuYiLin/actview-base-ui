import { watch } from 'actview';
import { NOOP } from '@/internals/noop';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { useLabelableContext } from './LabelableContext';

export function useLabelableId(params: UseLabelableIdParameters = {}): string {
  const {id, enabled = true} = params;

  const {controlId, registerControlId, resetControlId} = toValueLabelable();

  // Deliberately not seeded with `id`: on React 17 the seed would stick around after the
  // `id` prop is removed, leaving the control on a stale id forever.
  const defaultId = useBaseUiId();

  const controlSourceRef = {current: Symbol()};
  const hasRegisteredRef = {current: false};
  const hadExplicitIdRef = {current: false};

  const unregisterControlId = () => {
    if (!hasRegisteredRef.current || registerControlId === NOOP) {
      return;
    }

    hasRegisteredRef.current = false;
    registerControlId(controlSourceRef.current, undefined);
  };

  // React 版 useIsoLayoutEffect（注册）
  watch(
    () => [id, enabled, defaultId] as const,
    () => {
      if (!enabled || registerControlId === NOOP) {
        unregisterControlId();
        return;
      }

      let nextId: string | null | undefined;

      if (id !== undefined) {
        hadExplicitIdRef.current = true;
        nextId = id;
      } else if (hadExplicitIdRef.current) {
        nextId = defaultId;
      } else {
        // An id-less replacement must claim the provider's fallback so a previously registered
        // explicit id is not retained after its control unmounts.
        resetControlId();
        return;
      }

      // Either the control never had an explicit `id`, or React 17 has not assigned the
      // fallback id yet. Neither is worth registering.
      if (nextId === undefined) {
        unregisterControlId();
        return;
      }

      hasRegisteredRef.current = true;
      registerControlId(controlSourceRef.current, nextId);
    },
    {flush: 'post', immediate: true},
  );

  // Unregistering in the layout phase, not a passive effect: a replacement control's layout
  // effect would otherwise run first and still see the outgoing control's registration.
  watch(
    () => unregisterControlId,
    (_v, _old, onCleanup) => {
      onCleanup(unregisterControlId);
    },
    {immediate: true},
  );

  // The provider's id wins until registration runs: the label renders `htmlFor` from the
  // provider's pre-registration state, so preempting it with an explicit `id` here would
  // leave the pair unassociated in server-rendered markup.
  return ((enabled ? controlId.value : undefined) ?? id ?? defaultId) as string;
}

function toValueLabelable() {
  const ctx = useLabelableContext();
  return ctx.value;
}

export interface UseLabelableIdParameters {
  /**
   * The control's `id`. Pass `null` for a control that takes its name from `aria-labelledby`
   * instead, so that the label omits `htmlFor`.
   */
  id?: string | null | undefined;
  /**
   * Whether the control owns the label association of its labelable scope.
   * @default true
   */
  enabled?: boolean | undefined;
}

export type UseLabelableIdReturnValue = string;

export interface UseLabelableIdState {}
