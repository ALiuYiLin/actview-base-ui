import { computed, ref } from 'actview';
import { useIsoLayoutEffect } from '@base-ui/actview-utils/useIsoLayoutEffect';
import { createContext } from '@/internals/createContext';

interface ClosePartContextValue {
  register: () => () => void;
}

export const ClosePartContext = createContext<ClosePartContextValue | undefined>(
  'base-ui-close-part-context',
  undefined,
);

export function useClosePartCount() {
  const closePartCount = ref(0);

  const register = () => {
    closePartCount.value += 1;

    return () => {
      closePartCount.value = Math.max(0, closePartCount.value - 1);
    };
  };

  const context = { register };

  return {
    context,
    hasClosePart: computed(() => closePartCount.value > 0),
  };
}

export function useClosePartRegistration() {
  const context = ClosePartContext.use();

  useIsoLayoutEffect(() => {
    return context.value?.register();
  });
}
