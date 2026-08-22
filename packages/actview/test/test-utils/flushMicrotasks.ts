import { nextTick } from 'actview';

/**
 * Flushes pending microtask work (the computed → Provider watch → re-render
 * chains that ActView schedules asynchronously).
 *
 * Equivalent to MUI's `flushMicrotasks` (`await act(async () => {})`): in
 * ActView the shared scheduler flush is `nextTick`, so awaiting it settles any
 * state changes triggered by synchronous events.
 */
export async function flushMicrotasks() {
  await nextTick();
}
