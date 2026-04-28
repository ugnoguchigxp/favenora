import { describe, expect, it } from 'vitest';
import {
  createExternalSourceSchema,
  createUploadIntentSchema,
  deliveryUrlQuerySchema,
} from '../shared/schemas/media.schema';

describe('media shared schemas', () => {
  it('normalizes upload intent metadata and strips filename markup', () => {
    const parsed = createUploadIntentSchema.parse({
      ownerId: '550e8400-e29b-41d4-a716-446655440000',
      originalFilename: '<b>Cover.PNG</b>',
      mimeType: 'IMAGE/PNG',
      byteSize: 4096,
    });

    expect(parsed.originalFilename).toBe('Cover.PNG');
    expect(parsed.mimeType).toBe('image/png');
    expect(parsed.ownerType).toBe('user');
    expect(parsed.visibility).toBe('private');
  });

  it('validates delivery URL query bounds', () => {
    expect(() =>
      deliveryUrlQuerySchema.parse({
        purpose: 'inline',
        ttlSeconds: '10',
      })
    ).toThrow();

    const parsed = deliveryUrlQuerySchema.parse({
      purpose: 'download',
      ttlSeconds: '600',
    });
    expect(parsed.ttlSeconds).toBe(600);
  });

  it('validates external source URLs', () => {
    expect(() =>
      createExternalSourceSchema.parse({
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
        sourceType: 'embed',
        url: 'not-a-url',
      })
    ).toThrow();
  });
});
