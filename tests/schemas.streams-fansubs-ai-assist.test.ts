import { describe, expect, it } from 'vitest';
import { createTranslationDraftSchema } from '../shared/schemas/ai-assist.schema';
import {
  createFanTranslationTrackSchema,
  putSubtitleCuesSchema,
} from '../shared/schemas/fansubs.schema';
import { createStreamSchema, streamScheduleSchema } from '../shared/schemas/streams.schema';

describe('streams schema', () => {
  it('parses stream create payload', () => {
    const parsed = createStreamSchema.parse({
      creatorId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Live coding',
      visibility: 'public',
      embedUrl: 'https://example.com/live',
      embedProvider: 'youtube',
    });
    expect(parsed.title).toBe('Live coding');
  });

  it('validates scheduled date as iso string', () => {
    expect(() => streamScheduleSchema.parse({ scheduledAt: 'invalid' })).toThrow();
  });
});

describe('fansubs schema', () => {
  it('parses translation track input', () => {
    const parsed = createFanTranslationTrackSchema.parse({
      contributionType: 'subtitle_track',
      sourceLanguage: 'ja',
      targetLanguage: 'en',
      title: 'English track',
      visibility: 'public',
    });
    expect(parsed.contributionType).toBe('subtitle_track');
  });

  it('requires at least one cue text char', () => {
    expect(() =>
      putSubtitleCuesSchema.parse({ cues: [{ startMs: 0, endMs: 10, text: '', sortOrder: 0 }] })
    ).toThrow();
  });
});

describe('ai-assist schema', () => {
  it('parses translation draft request', () => {
    const parsed = createTranslationDraftSchema.parse({
      targetType: 'subtitle_track',
      sourceLanguage: 'ja',
      targetLanguage: 'en',
      segments: [{ sourceText: 'こんにちは', sortOrder: 0 }],
    });
    expect(parsed.segments).toHaveLength(1);
  });
});
