import { describe, expect, it, vi } from 'vitest';
import { OTPField } from '@/otp-field';
import { render, screen, fireEvent, act } from '#test-utils/rtl';

async function settle() {
  await act(async () => {});
}

function TestOTP(props: any = {}) {
  const {rootProps = {}, inputProps = {}} = props;
  return () => (
    <OTPField.Root {...rootProps}>
      {(state: any) =>
        Array.from({length: state.length}, (_, index) => (
          <OTPField.Input key={index} index={index} {...inputProps} data-testid={`input-${index}`} />
        ))
      }
    </OTPField.Root>
  );
}

describe('<OTPField.Root />', () => {
  it('renders the inputs via the render prop', async () => {
    await render(<TestOTP rootProps={{length: 3}} />);
    await settle();

    for (let i = 0; i < 3; i += 1) {
      expect(screen.getByTestId(`input-${i}`)).not.toBe(null);
    }
  });
});
