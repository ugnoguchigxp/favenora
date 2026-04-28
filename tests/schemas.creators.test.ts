import { describe, expect, it } from 'vitest';
import {
  createCreatorProfileSchema,
  replaceCreatorLinksSchema,
  replaceCreatorPortfolioSchema,
  updateCreatorProfileSchema,
} from '../shared/schemas/creators.schema';

describe('creators shared schemas', () => {
  it('normalizes slug and sanitizes display name', () => {
    const parsed = createCreatorProfileSchema.parse({
      slug: 'My-Creator',
      displayName: '<script>alert(1)</script>Jane',
    });

    expect(parsed.slug).toBe('my-creator');
    expect(parsed.displayName).toBe('Jane');
  });

  it('rejects invalid slugs', () => {
    expect(() =>
      createCreatorProfileSchema.parse({
        slug: '-bad-slug',
        displayName: 'Jane',
      })
    ).toThrow();
  });

  it('sanitizes nullable profile fields and validates category limits', () => {
    const parsed = updateCreatorProfileSchema.parse({
      tagline: '<b>Hello</b>',
      bio: '',
      tags: [' fantasy ', '<i>art</i>'],
      categories: ['novel', 'illustration'],
    });

    expect(parsed.tagline).toBe('<b>Hello</b>');
    expect(parsed.bio).toBeNull();
    expect(parsed.tags).toEqual(['fantasy', '<i>art</i>']);
  });

  it('validates links and portfolio replacement inputs', () => {
    const links = replaceCreatorLinksSchema.parse({
      links: [{ kind: 'website', label: 'Site', url: 'https://example.com', sortOrder: 1 }],
    });
    expect(links.links[0].kind).toBe('website');

    const portfolio = replaceCreatorPortfolioSchema.parse({
      portfolioItems: [{ title: 'Work', url: '', visibility: 'public' }],
    });
    expect(portfolio.portfolioItems[0].url).toBeNull();
  });
});
