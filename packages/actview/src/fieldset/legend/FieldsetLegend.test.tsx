import { describe, expect, it, vi } from 'vitest';
import { ref } from 'actview';
import { FieldsetRoot } from '@/fieldset/root/FieldsetRoot';
import { FieldsetLegend } from '@/fieldset/legend/FieldsetLegend';
import { createRenderer } from '../../../test/createRenderer';

const { render, fireEvent, act } = createRenderer();

function LegendAssociationDemo() {
  const legendId = ref('legend-a');
  const showLegend = ref(true);

  return (
    <>
      <FieldsetRoot>
        {showLegend.value ? <FieldsetLegend id={legendId.value}>Legend</FieldsetLegend> : null}
      </FieldsetRoot>
      <button
        type="button"
        data-testid="change-id"
        onClick={() => {
          legendId.value = 'legend-b';
        }}
      >
        Change id
      </button>
      <button
        type="button"
        data-testid="remove-legend"
        onClick={() => {
          showLegend.value = false;
        }}
      >
        Remove legend
      </button>
    </>
  );
}

describe('<Fieldset.Legend />', () => {
  it('should set aria-labelledby on the fieldset automatically', async () => {
    function Demo() {
      return (
        <FieldsetRoot>
          <FieldsetLegend data-testid="legend">Legend</FieldsetLegend>
        </FieldsetRoot>
      );
    }

    await render(Demo, {});

    // FieldsetLegend 的 id 注册是跨组件异步链（watch → Root 重渲染），需要 flush
    await act(() => {});

    const fieldset = document.querySelector('fieldset') as HTMLElement;
    const legend = document.querySelector('[data-testid="legend"]') as HTMLElement;
    expect(fieldset).toHaveAttribute('aria-labelledby', legend.id);
  });

  it('should set aria-labelledby on the fieldset with custom id', async () => {
    function Demo() {
      return (
        <FieldsetRoot>
          <FieldsetLegend id="legend-id" />
        </FieldsetRoot>
      );
    }

    await render(Demo, {});

    await act(() => {});

    expect(document.querySelector('fieldset')).toHaveAttribute('aria-labelledby', 'legend-id');
  });

  it('updates and clears the legend association', async () => {
    await render(LegendAssociationDemo, {});

    // 初始注册是跨组件异步链（watch → Root 重渲染），需要 flush
    await act(() => {});

    const fieldset = document.querySelector('fieldset') as HTMLElement;
    expect(fieldset).toHaveAttribute('aria-labelledby', 'legend-a');

    await act(() => {
      fireEvent.click(document.querySelector('[data-testid="change-id"]') as HTMLElement);
    });
    expect(fieldset).toHaveAttribute('aria-labelledby', 'legend-b');

    await act(() => {
      fireEvent.click(document.querySelector('[data-testid="remove-legend"]') as HTMLElement);
    });
    expect(fieldset).not.toHaveAttribute('aria-labelledby');
  });

  // actview 框架把 setup 错误捕获为 console.error 日志（不 rethrow），断言日志消息
  it('logs a descriptive error when rendered outside <Fieldset.Root>', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await render(FieldsetLegend, {});
      expect(errorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          message: expect.stringContaining(
            'Base UI: FieldsetRootContext is missing. Fieldset parts must be placed within <Fieldset.Root>.',
          ),
        }),
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  // React 原版另有 2 个 SSR 用例（isJSDOM 下 skip）：actview 无 renderToString/hydration
  // 基建，不移植（环境能力差异，非组件问题）。
});
