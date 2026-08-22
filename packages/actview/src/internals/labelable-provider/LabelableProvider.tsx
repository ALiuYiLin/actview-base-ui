import { computed, ref } from 'actview';
import type { VNodeChild } from '@actview/jsx';
import { useRefWithInit } from '@base-ui/actview-utils/useRefWithInit';
import type { HTMLProps } from '@/internals/types';
import { useBaseUiId } from '@/internals/useBaseUiId';
import { LabelableContext, useLabelableContext } from '@/internals/labelable-provider/LabelableContext';

export function LabelableProvider(props: LabelableProvider.Props) {
  const defaultId = useBaseUiId();

  const controlIdState = ref<string | null | undefined>(defaultId);
  const labelId = ref<string | undefined>(undefined);
  const messageIds = ref<string[]>([]);

  // `undefined` only survives until the fallback id is assigned. Do not use `??`:
  // `null` deliberately suppresses `htmlFor`.
  const controlId = computed(() =>
    controlIdState.value === undefined ? defaultId : controlIdState.value,
  );

  const registrationsRef = useRefWithInit(() => new Map<symbol, string | null>());

  const parentContext = useLabelableContext();

  const registerControlId = (source: symbol, nextId: string | null | undefined) => {
    const registrations = registrationsRef.current;

    if (nextId === undefined) {
      registrations.delete(source);
    } else {
      registrations.set(source, nextId);
    }

    const prev = controlIdState.value;
    if (registrations.size === 0) {
      // A hidden subtree (React Activity, a re-suspending Suspense) destroys effects but keeps
      // its DOM, so preserve its selected control.
      return;
    }

    let nextControlId: string | null | undefined;

    for (const id of registrations.values()) {
      // Keep the current selection while it is still registered, so rapid unmount/remount
      // cycles don't churn it.
      if (id === prev) {
        return;
      }

      if (nextControlId === undefined) {
        nextControlId = id;
      }
    }

    controlIdState.value = nextControlId;
  };

  const resetControlId = () => {
    if (registrationsRef.current.size === 0) {
      controlIdState.value = defaultId;
    }
  };

  const getDescriptionProps = (externalProps: HTMLProps) => {
    const describedBy = externalProps['aria-describedby'];
    const ids = typeof describedBy === 'string' ? describedBy.split(' ') : [];
    ids.push(...parentContext.value.messageIds, ...messageIds.value);

    return {
      ...externalProps,
      'aria-describedby': Array.from(new Set(ids)).join(' ') || undefined,
    };
  };

  const setLabelId = (
    next:
      | string
      | undefined
      | ((current: string | undefined) => string | undefined),
  ) => {
    // 函数式更新（对齐 React 函数式 setState）：注销时只清"当前值 === 自己的 id"
    // 的注册——否则 keyed remount 场景下旧实例卸载会把新实例刚注册的 id 清成
    // undefined（label precedence 链断裂）
    labelId.value =
      typeof next === 'function' ? (next as (c: string | undefined) => string | undefined)(labelId.value) : next;
  };

  const setMessageIds = (ids: string[]) => {
    messageIds.value = ids;
  };

  const contextValue = computed(() => ({
    controlId: controlId.value,
    registerControlId,
    resetControlId,
    labelId: labelId.value,
    setLabelId,
    messageIds: messageIds.value,
    setMessageIds,
    getDescriptionProps,
  }));

  return (
    <LabelableContext.Provider value={contextValue}>
      {props.children}
    </LabelableContext.Provider>
  );
}

export interface LabelableProviderState {}

export interface LabelableProviderProps {
  children?: VNodeChild;
}

export namespace LabelableProvider {
  export type State = LabelableProviderState;
  export type Props = LabelableProviderProps;
}
