import { describe, expect, it } from 'vitest';
import { createToastManager } from '@/toast';

describe('createToastManager', () => {
  it('works without a Provider (imperative)', async () => {
    const manager = createToastManager();
    const id = manager.add({title: 'Imperative'});
    expect(manager.getSnapshot().toasts.length).toBe(1);

    manager.close(id);
    expect(manager.getSnapshot().toasts.length).toBe(0);
  });
});
