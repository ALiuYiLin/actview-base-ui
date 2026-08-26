import { expect, vi } from 'vitest';
import { defineComponent } from 'actview';
import { Meter } from '@/meter';
import { MeterRootContext } from '../root/MeterRootContext';
import { screen } from '#test-utils/rtl';
import { createRenderer, describeConformance } from '#test-utils';

describe('<Meter.Value />', () => {
  const { render } = createRenderer();

  describeConformance(<Meter.Value />, () => ({
    // conformance 检查容器首元素（actview 语义）——直接注入 context 而非包
    // Meter.Root（Root 的根是 div，会顶掉 span 的首元素位置）
    render: (node) => {
      const Wrapper = defineComponent(function () {
        const ctx = {
          formattedValue: '30%',
          percentageValue: 30,
          value: 30,
          setLabelId: () => {},
        };
        return () => <MeterRootContext.Provider value={ctx}>{node}</MeterRootContext.Provider>;
      });
      return render(Wrapper);
    },
    refInstanceof: window.HTMLSpanElement,
  }));

  describe('prop: children', () => {
    it('renders the value when children is not provided', async () => {
      await render(Meter.Root, {
        value: 30,
        children: <Meter.Value data-testid="value" />,
      });

      const value = screen.getByTestId('value');
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

      await render(Meter.Root, {
        value: 30,
        format,
        children: <Meter.Value data-testid="value" />,
      });

      const value = screen.getByTestId('value');
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
      await render(Meter.Root, {
        value: 30,
        format,
        children: <Meter.Value data-testid="value">{renderSpy}</Meter.Value>,
      });
      expect(renderSpy.mock.lastCall?.[0]).toEqual(formatValue(30));
      expect(renderSpy.mock.lastCall?.[1]).toEqual(30);
    });

    it('passes updated arguments to the render function when value changes', async () => {
      const renderSpy = vi.fn();

      const {setProps} = await render(Meter.Root, {
        value: 30,
        children: <Meter.Value>{renderSpy}</Meter.Value>,
      });

      expect(renderSpy.mock.lastCall?.[0]).toEqual(
        (0.3).toLocaleString(undefined, { style: 'percent' }),
      );
      expect(renderSpy.mock.lastCall?.[1]).toEqual(30);

      await setProps({value: 60});

      expect(renderSpy.mock.lastCall?.[0]).toEqual(
        (0.6).toLocaleString(undefined, { style: 'percent' }),
      );
      expect(renderSpy.mock.lastCall?.[1]).toEqual(60);
    });
  });
});
