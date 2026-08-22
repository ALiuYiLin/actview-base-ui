import { computed, ref, toValue } from 'actview';
import type { ComputedRef, Ref } from '@actview/core';
import { useControlled } from '@base-ui/actview-utils/useControlled';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useTransitionStatus, type TransitionStatus } from '@/internals/useTransitionStatus';
import type { CollapsibleRoot } from '@/collapsible/root/CollapsibleRoot';

type MaybeRefOrGetter<T> = T | Ref<T> | (() => T);

type SetPanelIdAction =
  | string
  | null
  | undefined
  | ((current: string | null | undefined) => string | null | undefined);

export function useCollapsibleRoot(
  parameters: UseCollapsibleRootParameters,
): UseCollapsibleRootReturnValue {
  const { defaultOpen = false, onOpenChange } = parameters;

  const openControlled = useControlled<boolean>({
    controlled: parameters.open,
    default: defaultOpen,
    name: 'Collapsible',
    state: 'open',
  });

  // `useControlled` types the value as `boolean | undefined`; `defaultOpen` always
  // resolves to a boolean, so unwrap the fallback to keep `open` a plain `ComputedRef<boolean>`.
  const open = computed(() => openControlled.value ?? false);

  const setOpen = (nextOpen: boolean) => {
    openControlled.setValueIfUncontrolled(nextOpen);
  };

  const disabled = computed(() => toValue(parameters.disabled));

  const { mounted, setMounted, transitionStatus } = useTransitionStatus(open, true, true);

  const defaultPanelId = useBaseUiId();
  // `undefined` uses the initial generated fallback; `null` means the panel unmounted.
  const registeredPanelId = ref<string | null | undefined>(undefined);
  const setPanelIdState = (
    action: SetPanelIdAction,
  ) => {
    registeredPanelId.value =
      typeof action === 'function' ? action(registeredPanelId.value) : action;
  };
  const panelId = computed(() => {
    const id = registeredPanelId.value;
    return id === null ? undefined : (id ?? defaultPanelId);
  });

  const handleTrigger = (event: MouseEvent | KeyboardEvent) => {
    const nextOpen = !open.value;
    const eventDetails = createChangeEventDetails(REASONS.triggerPress, event);

    onOpenChange(nextOpen, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setOpen(nextOpen);
  };

  return {
    defaultPanelId,
    disabled,
    handleTrigger,
    mounted,
    open,
    panelId,
    setMounted,
    setOpen,
    setPanelIdState,
    transitionStatus,
  };
}

export interface UseCollapsibleRootParameters {
  /**
   * Whether the collapsible panel is currently open.
   *
   * To render an uncontrolled collapsible, use the `defaultOpen` prop instead.
   */
  open?: MaybeRefOrGetter<boolean | undefined>;
  /**
   * Whether the collapsible panel is initially open.
   *
   * To render a controlled collapsible, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Event handler called when the panel is opened or closed.
   */
  onOpenChange: (open: boolean, eventDetails: CollapsibleRoot.ChangeEventDetails) => void;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled: MaybeRefOrGetter<boolean>;
}

export interface UseCollapsibleRootReturnValue {
  defaultPanelId: string | undefined;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: ComputedRef<boolean>;
  handleTrigger: (event: MouseEvent | KeyboardEvent) => void;
  /**
   * Whether the collapsible panel is mounted for transition and hidden-state
   * purposes. This can be `false` while the element remains in the DOM when
   * `keepMounted` or `hiddenUntilFound` is enabled.
   */
  mounted: Ref<boolean>;
  /**
   * Whether the collapsible panel is currently open.
   */
  open: ComputedRef<boolean>;
  panelId: ComputedRef<string | undefined>;
  setMounted: (nextMounted: boolean) => void;
  setOpen: (nextOpen: boolean) => void;
  setPanelIdState: (action: SetPanelIdAction) => void;
  transitionStatus: Ref<TransitionStatus>;
}

export interface UseCollapsibleRootState {}
