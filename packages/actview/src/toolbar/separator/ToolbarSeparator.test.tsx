import { describe, expect, it, vi } from 'vitest';
import { ToolbarRoot } from '@/toolbar/root/ToolbarRoot';
import { ToolbarSeparator } from '@/toolbar/separator/ToolbarSeparator';
import { createRenderer } from '../../../test/createRenderer';

const { render } = createRenderer();

function ToolbarWithSeparator(props: any) {
  const { separatorProps, ...rootProps } = props;
  return (
    <ToolbarRoot {...rootProps}>
      <ToolbarSeparator {...separatorProps} data-testid="separator" />
    </ToolbarRoot>
  );
}

describe('<ToolbarSeparator />', () => {
  it.each([
    ['horizontal', 'vertical'],
    ['vertical', 'horizontal'],
  ] as const)(
    'uses a %s separator in a %s toolbar',
    async (separatorOrientation, toolbarOrientation) => {
      await render(ToolbarWithSeparator, { orientation: toolbarOrientation });

      const separator = document.querySelector('[data-testid="separator"]') as HTMLElement;
      expect(separator).toHaveAttribute('aria-orientation', separatorOrientation);
    },
  );

  it('allows its orientation to be overridden', async () => {
    await render(ToolbarWithSeparator, {
      orientation: 'horizontal',
      separatorProps: { orientation: 'horizontal' },
    });

    const separator = document.querySelector('[data-testid="separator"]') as HTMLElement;
    expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
  });

  // actview 框架会把 setup 期错误捕获为 console.error 日志（不 rethrow），
  // 因此断言日志消息而非 rejects（对齐 actview 错误传播行为）
  it('logs a descriptive error when rendered outside Toolbar.Root', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await render(ToolbarSeparator, {});
      // actview 错误日志：console.error('[actview] 组件渲染错误:', Error{...}) 双参数
      expect(errorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          message: expect.stringContaining(
            'Base UI: ToolbarRootContext is missing. Toolbar parts must be placed within <Toolbar.Root>.',
          ),
        }),
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});
