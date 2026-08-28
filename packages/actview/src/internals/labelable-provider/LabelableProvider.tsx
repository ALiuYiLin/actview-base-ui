import {computed, ref, shallowRef} from 'actview';
import type { HTMLProps } from '@/internals/types';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { LabelableContext, useLabelableContext } from './LabelableContext';

export function LabelableProvider(props: LabelableProvider.Props) {
  // ============ setup（只执行一次）：一次性初始化 ============
  const defaultId = useBaseUiId();

  const controlIdState = ref<string | null | undefined>(defaultId);
  const labelIdState = ref<string | undefined>(undefined);
  const messageIdsState = ref<string[]>([]);

  // `undefined` only survives until the React 17 fallback id is assigned. Do not use `??`:
  // `null` deliberately suppresses `htmlFor`.
  const controlId = computed(() =>
    controlIdState.value === undefined ? defaultId : controlIdState.value,
  );
  const labelId = computed(() => labelIdState.value);
  const messageIds = computed(() => messageIdsState.value);

  const registrationsRef = shallowRef(new Map<symbol, string | null>());

  const {messageIds: parentMessageIds} = useLabelableContext();

  const registerControlId = (source: symbol, nextId: string | null | undefined) => {
    const registrations = registrationsRef.value;

    if (nextId === undefined) {
      registrations.delete(source);
    } else {
      registrations.set(source, nextId);
    }

    controlIdState.value = ((prev) => {
      if (registrations.size === 0) {
        // A hidden subtree (React Activity, a re-suspending Suspense) destroys effects but keeps
        // its DOM, so preserve its selected control.
        return prev;
      }

      let nextControlId: string | null | undefined;

      for (const id of registrations.values()) {
        // Keep the current selection while it is still registered, so rapid unmount/remount
        // cycles don't churn it.
        if (id === prev) {
          return prev;
        }

        if (nextControlId === undefined) {
          nextControlId = id;
        }
      }

      return nextControlId;
    })(controlIdState.value);
  };

  const resetControlId = () => {
    if (registrationsRef.value.size === 0) {
      controlIdState.value = defaultId;
    }
  };

  const setLabelId = (
    v: string | undefined | ((prev: string | undefined) => string | undefined),
  ) => {
    labelIdState.value = typeof v === 'function' ? v(labelIdState.value) : v;
  };

  const setMessageIds = (v: string[] | ((prev: string[]) => string[])) => {
    messageIdsState.value = typeof v === 'function' ? v(messageIdsState.value) : v;
  };

  const getDescriptionProps = (externalProps: HTMLProps): HTMLProps => {
    const ids = externalProps['aria-describedby']
      ? String(externalProps['aria-describedby']).split(' ')
      : [];
    ids.push(...parentMessageIds.value, ...messageIdsState.value);

    return {
      ...externalProps,
      'aria-describedby': Array.from(new Set(ids)).join(' ') || undefined,
    };
  };

  const contextValue = {
    controlId,
    registerControlId,
    resetControlId,
    labelId,
    setLabelId,
    messageIds,
    setMessageIds,
    getDescriptionProps,
  };

  // ============ render（最后 return JSX——插件转换为渲染函数）============
  // children 渲染期直读（props 代理，每次渲染最新）。
  return (
    <LabelableContext.Provider value={contextValue}>{props.children}</LabelableContext.Provider>
  );
}

export interface LabelableProviderState {}

export interface LabelableProviderProps {
  children?: any;
}

export namespace LabelableProvider {
  export type State = LabelableProviderState;
  export type Props = LabelableProviderProps;
}
