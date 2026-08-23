import { ref } from 'actview';

/**
 * Generates a unique id. (actview 版：setup 期生成一次，稳定返回字符串。)
 */
export function useId(): string {
  const id = ref('');
  if (id.value === '') {
    id.value = generateActviewId();
  }
  return id.value;
}

let actviewIdCounter = 0;

export function generateActviewId(): string {
  actviewIdCounter += 1;
  return `base-ui-actview-id-${actviewIdCounter}`;
}
