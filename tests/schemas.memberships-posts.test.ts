import { describe, expect, it } from 'vitest';
import {
  createMembershipTierSchema,
  entitlementCheckQuerySchema,
} from '../shared/schemas/memberships.schema';
import { createPostDraftSchema, postViewerSchema } from '../shared/schemas/posts.schema';

describe('memberships and posts shared schemas', () => {
  it('sanitizes membership tier input and normalizes currency', () => {
    const parsed = createMembershipTierSchema.parse({
      creatorId: '550e8400-e29b-41d4-a716-446655440000',
      name: '<b>Gold</b>',
      description: '<script>alert(1)</script>behind the scenes',
      priceAmount: 500,
      currency: 'jpy',
      benefits: [{ kind: 'post_access', label: '<i>Posts</i>' }],
    });

    expect(parsed.currency).toBe('JPY');
    expect(parsed.description).toBe('behind the scenes');
    expect(parsed.benefits[0].label).toBe('<i>Posts</i>');
  });

  it('requires tier rules for tier-only post drafts at service boundary and validates slug shape', () => {
    expect(() =>
      createPostDraftSchema.parse({
        title: 'Bad slug',
        slug: 'Bad Slug',
      })
    ).toThrow();

    const parsed = createPostDraftSchema.parse({
      creatorId: '550e8400-e29b-41d4-a716-446655440000',
      title: '<b>Update</b>',
      slug: 'creator-update',
      accessType: 'tiers',
      accessRules: [{ ruleType: 'tier', tierId: '550e8400-e29b-41d4-a716-446655440001' }],
      blocks: [{ type: 'text', sortOrder: 0, visibility: 'preview', data: { text: 'Preview' } }],
      tags: ['Making Of'],
    });

    expect(parsed.title).toBe('<b>Update</b>');
    expect(parsed.blocks[0].visibility).toBe('preview');
  });

  it('parses comma separated tier ids for entitlement checks', () => {
    const parsed = entitlementCheckQuerySchema.parse({
      creatorId: '550e8400-e29b-41d4-a716-446655440000',
      targetType: 'post',
      tierIds: '550e8400-e29b-41d4-a716-446655440001,550e8400-e29b-41d4-a716-446655440002',
    });

    expect(parsed.tierIds).toEqual([
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
    ]);
  });

  it('accepts locked viewer payload without full blocks', () => {
    const now = new Date().toISOString();
    const post = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      creatorId: '550e8400-e29b-41d4-a716-446655440000',
      postType: 'article',
      title: 'Members post',
      slug: 'members-post',
      summary: 'Preview',
      status: 'published',
      accessType: 'tiers',
      ageRating: 'all_ages',
      isAiGenerated: false,
      language: 'ja',
      thumbnailMediaId: null,
      publishedAt: now,
      scheduledAt: null,
      backdatedAt: null,
      editedAt: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    const parsed = postViewerSchema.parse({
      kind: 'locked',
      post,
      previewBlocks: [
        { type: 'text', sortOrder: 0, visibility: 'preview', data: { text: 'Preview' } },
      ],
      requiredTierIds: ['550e8400-e29b-41d4-a716-446655440001'],
    });

    expect(parsed.kind).toBe('locked');
    expect(parsed).not.toHaveProperty('blocks');
  });
});
