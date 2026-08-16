import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@actview/testing';
import { computed, provide, ref, useInjects } from 'actview';

describe('actview wiring smoke test', () => {
  afterEach(cleanup);

  it('renders, reacts to events, tracks computed values and injections', async () => {
    function Counter(props: { initial?: number; step?: number }) {
      const count = ref(props.initial ?? 0);
      const doubled = computed(() => count.value * 2);
      provide('doubled', doubled);
      function inc() {
        count.value += props.step ?? 1;
      }
      return (
        <div>
          <button data-testid="inc" onClick={inc}>
            +
          </button>
          <span data-testid="count">{count.value}</span>
          <Doubled />
        </div>
      );
    }

    function Doubled() {
      const value = useInjects('doubled') as ReturnType<typeof computed<number>> | undefined;
      return <span data-testid="doubled">{value?.value}</span>;
    }

    function Harness() {
      return <Counter initial={1} step={2} />;
    }

    const result = render(Harness);

    expect(result.getByTestId('count').textContent).toBe('1');
    expect(result.getByTestId('doubled').textContent).toBe('2');

    fireEvent(result.getByTestId('inc'), 'click');
    fireEvent(result.getByTestId('inc'), 'click');

    await waitFor(() => {
      expect(result.getByTestId('count').textContent).toBe('5');
    });
    await waitFor(() => {
      expect(result.getByTestId('doubled').textContent).toBe('10');
    });
  });
});
