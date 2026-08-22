import { describe, expect, it } from 'vitest';
import { ProgressRoot } from './ProgressRoot';
import { ProgressLabel } from '../label/ProgressLabel';
import { ProgressValue } from '../value/ProgressValue';
import { ProgressTrack } from '../track/ProgressTrack';
import { ProgressIndicator } from '../indicator/ProgressIndicator';
import { createRenderer } from '../../../test/createRenderer';

describe('<Progress.Root />', () => {
  const { render } = createRenderer();

  it('renders a div element', async () => {
    function Demo() {
      return <ProgressRoot value={50} data-testid="root" />;
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('root');
    expect(el).toBeInstanceOf(HTMLDivElement);
  });

  it('sets the correct aria attributes', async () => {
    function Demo() {
      return <ProgressRoot value={30} data-testid="root" />;
    }

    const result = await render(Demo, {});
    const el = result.getByTestId('root');
    expect(el).toHaveAttribute('role', 'progressbar');
    expect(el).toHaveAttribute('aria-valuenow', '30');
    expect(el).toHaveAttribute('aria-valuemin', '0');
    expect(el).toHaveAttribute('aria-valuemax', '100');
  });

  it('renders sub-components', async () => {
    function Demo() {
      return (
        <ProgressRoot value={50}>
          <ProgressLabel data-testid="label">Upload</ProgressLabel>
          <ProgressValue data-testid="value" />
          <ProgressTrack data-testid="track">
            <ProgressIndicator data-testid="indicator" />
          </ProgressTrack>
        </ProgressRoot>
      );
    }

    const result = await render(Demo, {});
    expect(result.getByTestId('label')).toBeInstanceOf(HTMLSpanElement);
    expect(result.getByTestId('value')).toBeInstanceOf(HTMLSpanElement);
    expect(result.getByTestId('track')).toBeInstanceOf(HTMLDivElement);
    expect(result.getByTestId('indicator')).toBeInstanceOf(HTMLDivElement);
  });
});