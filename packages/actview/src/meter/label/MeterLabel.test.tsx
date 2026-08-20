import { describe, expect, it, vi } from 'vitest';
import { ref } from 'actview';
import { MeterRoot } from '../root/MeterRoot';
import { MeterLabel } from './MeterLabel';
import { createRenderer } from '../../../test/createRenderer';

const { render, fireEvent, act } = createRenderer();

function LabelAssociationDemo() {
  const labelId = ref('label-a');
  const showLabel = ref(true);

  return (
    <>
      <MeterRoot value={50}>
        {showLabel.value ? <MeterLabel id={labelId.value}>Battery level</MeterLabel> : null}
      </MeterRoot>
      <button
        type="button"
        data-testid="change-id"
        onClick={() => {
          labelId.value = 'label-b';
        }}
      >
        Change id
      </button>
      <button
        type="button"
        data-testid="remove-label"
        onClick={() => {
          showLabel.value = false;
        }}
      >
        Remove label
      </button>
    </>
  );
}

describe('<Meter.Label />', () => {
  it('updates and clears the meter label association', async () => {
    await render(LabelAssociationDemo, {});

    // MeterLabel 的 id 注册是跨组件异步链（watch → Root 重渲染），需要 flush
    await act(() => {});

    const meter = document.querySelector('[role="meter"]') as HTMLElement;
    expect(meter).toHaveAttribute('aria-labelledby', 'label-a');

    await act(() => {
      fireEvent.click(document.querySelector('[data-testid="change-id"]') as HTMLElement);
    });
    expect(meter).toHaveAttribute('aria-labelledby', 'label-b');

    await act(() => {
      fireEvent.click(document.querySelector('[data-testid="remove-label"]') as HTMLElement);
    });
    expect(meter).not.toHaveAttribute('aria-labelledby');
  });

  // actview 框架把 setup 错误捕获为 console.error 日志（不 rethrow），断言日志消息
  it('logs a descriptive error when rendered outside <Meter.Root>', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await render(MeterLabel, {});
      expect(errorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          message: expect.stringContaining(
            'Base UI: MeterRootContext is missing. Meter parts must be placed within <Meter.Root>.',
          ),
        }),
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});
