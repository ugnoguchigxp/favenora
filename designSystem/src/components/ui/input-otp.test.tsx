import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from './input-otp';

describe('InputOTP', () => {
  it('renders correctly', async () => {
    render(
      <InputOTP>
        <InputOTPGroup>
          <InputOTPSlot data-testid="slot-1" defaultValue="1" />
          <InputOTPSlot data-testid="slot-2" />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot data-testid="slot-3" />
        </InputOTPGroup>
      </InputOTP>
    );

    const slots = screen.getAllByRole('textbox');
    expect(slots).toHaveLength(3);
    expect(slots[0]).toHaveValue('1');
    const secondSlot = slots[1];
    expect(secondSlot).toBeDefined();
    if (!secondSlot) {
      throw new Error('Expected second OTP slot');
    }

    await userEvent.type(secondSlot, '2');
    expect(secondSlot).toHaveValue('2');
  });
});
