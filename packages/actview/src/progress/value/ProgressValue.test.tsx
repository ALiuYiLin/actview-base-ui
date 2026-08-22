import { describe, expect, it } from 'vitest';
import { ProgressValue } from '@/progress/value/ProgressValue';
import { ProgressRoot } from '@/progress/root/ProgressRoot';
import { createRenderer } from '#/test/createRenderer';

describe('<Progress.Value />', () => {
  const { render } = createRenderer();

  it('renders a span element', async () => {
    function Demo() {
      return (
        <ProgressRoot value={50}>
          <ProgressValue data-testid="value" />
        </ProgressRoot>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('value');
    expect(el).toBeInstanceOf(HTMLSpanElement);
  });

  it('displays formatted value', async () => {
    function Demo() {
      return (
        <ProgressRoot value={50}>
          <ProgressValue data-testid="value" />
        </ProgressRoot>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('value');
    expect(el).toHaveTextContent('50%');
  });
});