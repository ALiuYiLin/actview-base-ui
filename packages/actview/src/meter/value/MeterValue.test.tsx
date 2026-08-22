import { describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'actview';
import { MeterRoot } from '@/meter/root/MeterRoot';
import { MeterValue } from '@/meter/value/MeterValue';
import { createRenderer } from '../../../test/createRenderer';

const { render } = createRenderer();

function MeterValueDemo(props: any) {
  return (
    <MeterRoot {...props}>
      <MeterValue data-testid="value" />
    </MeterRoot>
  );
}

// ⚠️ 包装组件必须渲染期解构（defineComponent + return () =>）：setup 解构会冻结
// renderFn/value 快照（PD-15），setProps 后 rootProps 仍是旧值，MeterRoot 收不到更新
// ⚠️ 包装组件必须渲染期解构（defineComponent + return () =>）：setup 解构会冻结
// renderFn/value 快照（PD-15），setProps 后 rootProps 仍是旧值，MeterRoot 收不到更新
const MeterValueWithRender = defineComponent(function (props: any) {
  return () => {
    const { renderFn, ...rootProps } = props;
    return (
      <MeterRoot {...rootProps}>
        <MeterValue>{renderFn}</MeterValue>
      </MeterRoot>
    );
  };
});

describe('<Meter.Value />', () => {
  describe('prop: children', () => {
    it('renders the value when children is not provided', async () => {
      await render(MeterValueDemo, { value: 30 });

      const value = document.querySelector('[data-testid="value"]') as HTMLElement;
      expect(value.textContent).toBe((0.3).toLocaleString(undefined, { style: 'percent' }));
    });

    it('renders a formatted value when a format is provided', async () => {
      const format: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: 'USD',
      };
      function formatValue(v: number) {
        return new Intl.NumberFormat(undefined, format).format(v);
      }

      await render(MeterValueDemo, { value: 30, format });

      const value = document.querySelector('[data-testid="value"]') as HTMLElement;
      expect(value.textContent).toBe(formatValue(30));
    });

    it('accepts a render function', async () => {
      const renderSpy = vi.fn();
      const format: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: 'USD',
      };
      function formatValue(v: number) {
        return new Intl.NumberFormat(undefined, format).format(v);
      }

      await render(MeterValueWithRender, { renderFn: renderSpy, value: 30, format });

      expect(renderSpy.mock.lastCall?.[0]).toEqual(formatValue(30));
      expect(renderSpy.mock.lastCall?.[1]).toEqual(30);
    });

    it('passes updated arguments to the render function when value changes', async () => {
      const renderSpy = vi.fn();

      const result = await render(MeterValueWithRender, { renderFn: renderSpy, value: 30 });

      expect(renderSpy.mock.lastCall?.[0]).toEqual(
        (0.3).toLocaleString(undefined, { style: 'percent' }),
      );
      expect(renderSpy.mock.lastCall?.[1]).toEqual(30);

      await result.setProps({ value: 60 });

      expect(renderSpy.mock.lastCall?.[0]).toEqual(
        (0.6).toLocaleString(undefined, { style: 'percent' }),
      );
      expect(renderSpy.mock.lastCall?.[1]).toEqual(60);
    });
  });
});
