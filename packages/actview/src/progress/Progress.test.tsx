import { expect, vi } from 'vitest';
import { Progress } from '@/progress';
import { Meter } from '@/meter';
import { createRenderer } from '#test-utils';
import { screen } from '#test-utils/rtl';

describe('<Progress />', () => {
  const { render } = createRenderer();

  it('renders role="progressbar" with aria attributes', async () => {
    await render(
      Progress.Root,
      {value: 40, children: null},
    );

    const root = document.querySelector('[role="progressbar"]') as HTMLElement;
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('aria-valuenow', '40');
    expect(root).toHaveAttribute('aria-valuemin', '0');
    expect(root).toHaveAttribute('aria-valuemax', '100');
  });

  it('is indeterminate when value is null', async () => {
    await render(Progress.Root, {children: null});

    const root = document.querySelector('[role="progressbar"]') as HTMLElement;
    expect(root).not.toHaveAttribute('aria-valuenow');
    expect(root).toHaveAttribute('data-indeterminate', '');
  });

  it('is complete at max', async () => {
    await render(Progress.Root, {value: 100, children: null});

    const root = document.querySelector('[role="progressbar"]') as HTMLElement;
    expect(root).toHaveAttribute('data-complete', '');
  });

  it('displays formatted value in Progress.Value', async () => {
    await render(
      Progress.Root,
      {value: 0.25, format: {style: 'percent'}, children: (<Progress.Value />)},
    );

    expect(screen.getByText('25%')).toBeInTheDocument();
  });
});

describe('<Meter />', () => {
  const { render } = createRenderer();

  it('renders role="meter" with aria attributes', async () => {
    await render(Meter.Root, {value: 60, children: null});

    const root = document.querySelector('[role="meter"]') as HTMLElement;
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('aria-valuenow', '60');
  });

  it('clamps value to max', async () => {
    await render(Meter.Root, {value: 150, children: null});

    const root = document.querySelector('[role="meter"]') as HTMLElement;
    expect(root).toHaveAttribute('aria-valuenow', '100');
  });

  it('displays formatted value in Meter.Value', async () => {
    await render(Meter.Root, {value: 50, children: (<Meter.Value />)});

    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});
