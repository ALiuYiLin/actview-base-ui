import { describe, expect, it } from 'vitest';
import { MeterRoot } from '@/meter/root/MeterRoot';
import { MeterTrack } from '@/meter/track/MeterTrack';
import { MeterIndicator } from '@/meter/indicator/MeterIndicator';
import { createRenderer } from '#/test/createRenderer';

const { render } = createRenderer();

function MeterWithIndicator(props: any) {
  return (
    <MeterRoot {...props}>
      <MeterTrack>
        <MeterIndicator data-testid="indicator" />
      </MeterTrack>
    </MeterRoot>
  );
}

describe('<Meter.Indicator />', () => {
  describe('value bounds', () => {
    it('clamps the width to 100% when the value exceeds max', async () => {
      await render(MeterWithIndicator, { value: 150 });

      const indicator = document.querySelector('[data-testid="indicator"]') as HTMLElement;
      expect(indicator.style.width).toBe('100%');
    });

    it('clamps the width to 0% when the value is below min', async () => {
      await render(MeterWithIndicator, { value: -10 });

      const indicator = document.querySelector('[data-testid="indicator"]') as HTMLElement;
      expect(indicator.style.width).toBe('0%');
    });

    it('produces a finite width when min equals max', async () => {
      await render(MeterWithIndicator, { value: 5, min: 5, max: 5 });

      const indicator = document.querySelector('[data-testid="indicator"]') as HTMLElement;
      expect(indicator.style.width).toBe('0%');
    });
  });

  // React 原版同款：computed style 断言需要浏览器布局，jsdom 环境不可用（describe.skipIf(isJSDOM)）。
  // actview 测试环境无 toHaveComputedStyle matcher，断言 inline style 属性
  describe.skip('internal styles', () => {
    it('sets positioning styles', async () => {
      await render(MeterWithIndicator, { value: 33, style: { width: '100px' } });

      const indicator = document.querySelector('[data-testid="indicator"]') as HTMLElement;
      expect(indicator.style.width).toBe('33%');
    });

    it('sets zero width when value is 0', async () => {
      await render(MeterWithIndicator, { value: 0, style: { width: '100px' } });

      const indicator = document.querySelector('[data-testid="indicator"]') as HTMLElement;
      expect(indicator.style.width).toBe('0%');
    });
  });
});
