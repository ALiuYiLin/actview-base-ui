import { expect } from 'vitest';
import { Meter } from '@/meter';
import { screen } from '#test-utils/rtl';
import { createRenderer, describeConformance } from '#test-utils';

describe('<Meter.Indicator />', () => {
  const { render } = createRenderer();

  describeConformance(<Meter.Indicator />, () => ({
    render: (node) => render(Meter.Root, {value: 30, children: node}),
    refInstanceof: window.HTMLDivElement,
  }));

  describe('value bounds', () => {
    it('clamps the width to 100% when the value exceeds max', async () => {
      await render(Meter.Root, {
        value: 150,
        children: (
          <Meter.Track>
            <Meter.Indicator data-testid="indicator" />
          </Meter.Track>
        ),
      });

      expect(screen.getByTestId('indicator').style.width).toBe('100%');
    });

    it('clamps the width to 0% when the value is below min', async () => {
      await render(Meter.Root, {
        value: -10,
        children: (
          <Meter.Track>
            <Meter.Indicator data-testid="indicator" />
          </Meter.Track>
        ),
      });

      expect(screen.getByTestId('indicator').style.width).toBe('0%');
    });

    it('produces a finite width when min equals max', async () => {
      await render(Meter.Root, {
        value: 5,
        min: 5,
        max: 5,
        children: (
          <Meter.Track>
            <Meter.Indicator data-testid="indicator" />
          </Meter.Track>
        ),
      });

      expect(screen.getByTestId('indicator').style.width).toBe('0%');
    });
  });
});
