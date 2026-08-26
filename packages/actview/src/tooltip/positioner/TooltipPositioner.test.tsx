import { describe, expect, it, vi } from 'vitest';
import { Tooltip } from '@/tooltip';
import { createRenderer, describeConformance } from '#test-utils';

describe('<Tooltip.Positioner />', () => {
  const { render } = createRenderer();

  describeConformance(<Tooltip.Positioner />, () => ({
    // actview conformance 检查容器首元素（Root 的根 div）；
    // render-prop ref 传递是组件内部机制——跳过。
    refInstanceof: window.HTMLDivElement,
    skip: ['renderProp'],
    render: (node) =>
      render(Tooltip.Root, {
        open: true,
        children: <Tooltip.Portal>{node}</Tooltip.Portal>,
      }),
  }));

  it('throws a descriptive error when rendered outside <Tooltip.Root>', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(render(Tooltip.Positioner)).rejects.toThrow(
        'Base UI: <Tooltip.Root> is missing. Tooltip parts must be placed within <Tooltip.Root>.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('throws a descriptive error when rendered outside <Tooltip.Portal>', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(
        render(Tooltip.Root, {
          open: true,
          children: <Tooltip.Positioner />,
        }),
      ).rejects.toThrow('Base UI: <Tooltip.Portal> is missing.');
    } finally {
      errorSpy.mockRestore();
    }
  });
});
