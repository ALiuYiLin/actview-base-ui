import { watch } from 'actview';
import { useBaseUiId } from '../internals/useBaseUiId';

// Tracks the most recently registered label id per `setLabelId` writer, so an older label's
// cleanup does not clear a newer label's id. This mirrors the React functional update
// `setLabelId((currentId) => (currentId === id ? undefined : currentId))` without needing
// read access to the current value (ActView `setLabelId` is a plain writer).
const registeredLabelId = new WeakMap<Function, string | undefined>();

export function useRegisteredLabelId(
  idProp: string | undefined,
  setLabelId: (id: string | undefined) => void,
): string | undefined {
  const id = useBaseUiId(idProp);

  watch(
    () => id,
    (_nextId, _prevId, onCleanup) => {
      setLabelId(id);
      registeredLabelId.set(setLabelId, id);

      onCleanup(() => {
        if (registeredLabelId.get(setLabelId) === id) {
          registeredLabelId.set(setLabelId, undefined);
          setLabelId(undefined);
        }
      });
    },
    { immediate: true },
  );

  return id;
}
