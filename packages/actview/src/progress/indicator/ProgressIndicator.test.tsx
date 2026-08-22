import { describe, expect, it } from 'vitest';
import { ProgressIndicator } from './ProgressIndicator';
import { ProgressRoot } from '../root/ProgressRoot';
import { createRenderer } from '../../../test/createRenderer';

describe('<Progress.Indicator />', () => {
  const { render } = createRenderer();

  it('renders a div element', async () => {
    function Demo() {
      return (
        <ProgressRoot value={50}>
          <ProgressIndicator data-testid="indicator" />
        </ProgressRoot>
      );
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('indicator');
    expect(el).toBeInstanceOf(HTMLDivElement);
  });
});