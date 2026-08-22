import { describe, expect, it } from 'vitest';
import { ProgressLabel } from '@/progress/label/ProgressLabel';
import { ProgressRoot } from '@/progress/root/ProgressRoot';
import { createRenderer } from '../../../test/createRenderer';

describe('<Progress.Label />', () => {
  const { render } = createRenderer();

  it('renders a span element', async () => {
    function Demo() {
      return (
        <ProgressRoot value={50}>
          <ProgressLabel data-testid="label">Upload</ProgressLabel>
        </ProgressRoot>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('label');
    expect(el).toBeInstanceOf(HTMLSpanElement);
  });
});