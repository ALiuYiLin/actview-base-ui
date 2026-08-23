import { computed, ref, toValue } from 'actview';
import type { ComputedRef } from 'actview';
import { useControlled } from '@/utils/useControlled';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { createChangeEventDetails } from '@/internals/createBaseUIEventDetails';
import { REASONS } from '@/internals/reasons';
import { useTransitionStatus, type TransitionStatus } from '@/internals/useTransitionStatus';
import type { MaybeRefOrGetter } from '@/internals/types';

export function useCollapsibleRoot(
  parameters: UseCollapsibleRootParameters,
): UseCollapsibleRootReturnValue {
  const [open, setOpen] = useControlled({
    controlled: () => toValue(parameters.open),
    default: () => toValue(parameters.defaultOpen) ?? false,
    name: 'Collapsible',
    state: 'open',
  });

  const {mounted, setMounted, transitionStatus} = useTransitionStatus(open, true, true);

  const defaultPanelId = useBaseUiId();
  // `undefined` uses the initial generated fallback; `null` means the panel unmounted.
  const registeredPanelId = ref<string | null | undefined>(undefined);
  const setPanelIdState = (value: string | null | undefined) => {
    registeredPanelId.value = value;
  };
  const panelId = computed(() =>
    registeredPanelId.value === null
      ? undefined
      : (registeredPanelId.value ?? defaultPanelId),
  );

  const handleTrigger = (event: MouseEvent | KeyboardEvent) => {
    const nextOpen = !toValue(open);
    const eventDetails = createChangeEventDetails(REASONS.triggerPress, event);

    // onOpenChange 是普通函数（组件传入的包装闭包），不是 getter——直接调用
    parameters.onOpenChange?.(nextOpen, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setOpen(nextOpen);
  };

  return {
    defaultPanelId,
    disabled: toValue(parameters.disabled) ?? false,
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
  open?: MaybeRefOrGetter<boolean | undefined> | undefined;
  /**
   * Whether the collapsible panel is initially open.
   *
   * To render a controlled collapsible, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: MaybeRefOrGetter<boolean | undefined> | undefined;
  /**
   * Event handler called when the panel is opened or closed.
   */
  onOpenChange?: ((open: boolean, eventDetails: any) => void) | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: MaybeRefOrGetter<boolean | undefined> | undefined;
}

export interface UseCollapsibleRootReturnValue {
  defaultPanelId: string | undefined;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  handleTrigger: (event: MouseEvent | KeyboardEvent) => void;
  /**
   * Whether the collapsible panel is mounted for transition and hidden-state
   * purposes. This can be `false` while the element remains in the DOM when
   * `keepMounted` or `hiddenUntilFound` is enabled.
   */
  mounted: ComputedRef<boolean>;
  /**
   * Whether the collapsible panel is currently open.
   */
  open: ComputedRef<boolean | undefined>;
  panelId: ComputedRef<string | undefined>;
  setMounted: (nextMounted: boolean) => void;
  setOpen: (open: boolean | undefined) => void;
  setPanelIdState: (value: string | null | undefined) => void;
  transitionStatus: ComputedRef<TransitionStatus>;
}

export interface UseCollapsibleRootState {}
