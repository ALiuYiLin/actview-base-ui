import { describe, expect, it, vi } from 'vitest';
import { OTPField } from '@/otp-field';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function TestOTP(props: any = {}) {
  const {rootProps = {}, inputProps = {}} = props;
  return (
    <OTPField.Root {...rootProps}>
      {(state: any) =>
        Array.from({length: state.length}, (_, index) => (
          <OTPField.Input key={index} index={index} {...inputProps} data-testid={`input-${index}`} />
        ))
      }
    </OTPField.Root>
  );
}

describe('<OTPField.Input />', () => {
  it('fills inputs as the value changes', async () => {
    await render(<TestOTP rootProps={{defaultValue: '12', length: 4}} />);
    await settle();
    await settle();

    expect(screen.getByTestId('input-0')).toHaveValue('1');
    expect(screen.getByTestId('input-1')).toHaveValue('2');
    expect(screen.getByTestId('input-2')).toHaveValue('');
  });

  it('updates the value on input change and calls onValueChange', async () => {
    const onValueChange = vi.fn();
    await render(<TestOTP rootProps={{length: 4, onValueChange}} />);
    await settle();

    const input = screen.getByTestId('input-0');
    fireEvent.input(input, {target: {value: '5'}});
    await settle();
    await settle();

    expect(screen.getByTestId('input-0')).toHaveValue('5');
    expect(onValueChange.mock.lastCall?.[0]).toBe('5');
  });

  it('moves focus to the next input after typing', async () => {
    await render(<TestOTP rootProps={{length: 2}} />);
    await settle();

    fireEvent.input(screen.getByTestId('input-0'), {target: {value: '7'}});
    await settle();
    await settle();

    expect(screen.getByTestId('input-1')).toHaveFocus();
  });

  it('removes a character on Backspace', async () => {
    await render(<TestOTP rootProps={{defaultValue: '12', length: 2}} />);
    await settle();
    await settle();

    fireEvent.keyDown(screen.getByTestId('input-1'), {key: 'Backspace'});
    await settle();
    await settle();

    expect(screen.getByTestId('input-0')).toHaveValue('1');
    expect(screen.getByTestId('input-1')).toHaveValue('');
  });

  it('only accepts numeric characters with numeric validation', async () => {
    const onValueChange = vi.fn();
    await render(<TestOTP rootProps={{length: 4, validationType: 'numeric', onValueChange}} />);
    await settle();

    fireEvent.input(screen.getByTestId('input-0'), {target: {value: 'a'}});
    await settle();
    await settle();

    expect(screen.getByTestId('input-0')).toHaveValue('');
    expect(onValueChange.mock.lastCall?.[0]).toBe('');
  });

  it('is disabled when the root is disabled', async () => {
    await render(<TestOTP rootProps={{length: 2, disabled: true}} />);
    await settle();

    expect(screen.getByTestId('input-0')).toHaveAttribute('disabled');
  });

  it('normalizes an over-length default value', async () => {
    await render(<TestOTP rootProps={{defaultValue: '12345', length: 3}} />);
    await settle();
    await settle();

    expect(screen.getByTestId('input-0')).toHaveValue('1');
    expect(screen.getByTestId('input-2')).toHaveValue('3');
  });
});
