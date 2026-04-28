import { describe, expect, it } from 'vitest';
import {
  contentSafetyCheckSchema,
  createBlockedTermSchema,
} from '../shared/schemas/content-safety.schema';
import { createTipCheckoutSchema } from '../shared/schemas/payments.schema';

describe('payments and content safety schemas', () => {
  it('normalizes payment currency and sanitizes tip message', () => {
    const parsed = createTipCheckoutSchema.parse({
      creatorId: '550e8400-e29b-41d4-a716-446655440000',
      amount: 1200,
      currency: 'jpy',
      message: '<script>alert(1)</script>thank you',
    });

    expect(parsed.currency).toBe('JPY');
    expect(parsed.message).toBe('thank you');
    expect(parsed.visibility).toBe('creator_only');
  });

  it('accepts content safety check targets and defaults blocked term fields', () => {
    const check = contentSafetyCheckSchema.parse({
      targetType: 'post_comment',
      text: 'hello',
    });
    const term = createBlockedTermSchema.parse({
      category: 'harassment',
      pattern: '<b>bad</b>',
    });

    expect(check.targetType).toBe('post_comment');
    expect(term.pattern).toBe('bad');
    expect(term.matchType).toBe('normalized');
    expect(term.decision).toBe('hold');
  });
});
