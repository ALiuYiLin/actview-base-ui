import { expect, vi } from 'vitest';
import { defineComponent, ref } from 'actview';
import { Meter } from '@/meter';
import { MeterRootContext } from '../root/MeterRootContext';
import { fireEvent, screen, waitFor } from '#test-utils/rtl';
import { createRenderer, describeConformance } from '#test-utils';

describe('<Meter.Label />', () => {
  const { render } = createRenderer();

  describeConformance(<Meter.Label />, () => ({
    // conformance 检查容器首元素（actview 语义）——直接注入 context 而非包
    // Meter.Root（Root 的根是 div，会顶掉 span 的首元素位置）
    render: (node) => {
      const Wrapper = defineComponent(function () {
        const ctx = {
          formattedValue: '50%',
          percentageValue: 50,
          value: 50,
          setLabelId: () => {},
        };
        return () => <MeterRootContext.Provider value={ctx}>{node}</MeterRootContext.Provider>;
      });
      return render(Wrapper);
    },
    refInstanceof: window.HTMLDivElement,
  }));

  it('updates and clears the meter label association', async () => {
    const showLabel = ref(true);

    const App = defineComponent(function () {
      return () => (
        <>
          <Meter.Root value={50}>
            {showLabel.value ? <Meter.Label>Battery level</Meter.Label> : null}
          </Meter.Root>
          <button type="button" onClick={() => (showLabel.value = false)}>
            Remove label
          </button>
        </>
      );
    });

    await render(App);

    const meter = screen.getByRole('meter');
    expect(meter.getAttribute('aria-labelledby')).toBe(
      screen.getByText('Battery level').getAttribute('id'),
    );

    fireEvent.click(screen.getByRole('button', {name: 'Remove label'}));
    await waitFor(() => {
      expect(meter).not.toHaveAttribute('aria-labelledby');
    });
  });

  it('throws a descriptive error when rendered outside <Meter.Root>', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(render(Meter.Label)).rejects.toThrow(
        'Base UI: MeterRootContext is missing. Meter parts must be placed within <Meter.Root>.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});
