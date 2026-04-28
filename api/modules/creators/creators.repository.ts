import { type SQL, sql } from 'drizzle-orm';
import type {
  CreateCreatorProfileInput,
  CreatorCategoryKey,
  CreatorStatus,
  ReplaceCreatorLinksInput,
  ReplaceCreatorPortfolioInput,
  UpdateCreatorProfileInput,
} from '../../../shared/schemas/creators.schema';
import { db } from '../../db/client';

type Executor = {
  execute: (query: SQL) => unknown;
};

export type CreatorProfileRow = {
  id: string;
  userId: string;
  slug: string;
  displayName: string;
  tagline: string | null;
  bio: string | null;
  avatarMediaId: string | null;
  bannerMediaId: string | null;
  publicLocationLabel: string | null;
  primaryLanguage: string | null;
  translationContributionsEnabled: boolean;
  commissionEnabled: boolean;
  status: CreatorStatus;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  reviewNote: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatorLinkRow = {
  id: string;
  kind: string;
  label: string;
  url: string;
  sortOrder: number;
};

export type CreatorPortfolioItemRow = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  mediaId: string | null;
  role: string | null;
  completedAt: string | null;
  sortOrder: number;
  visibility: 'public' | 'supporters' | 'private';
};

export type CreatorProfileSectionRow = {
  id: string;
  kind: 'about' | 'goals' | 'works' | 'supportMessage' | 'custom';
  title: string | null;
  body: string;
  sortOrder: number;
  visibility: 'public' | 'supporters' | 'private';
};

const toIsoString = (value: unknown) => {
  if (value instanceof Date) return value.toISOString();
  return value === null || value === undefined ? null : String(value);
};

const profileSelect = sql`
  id,
  user_id as "userId",
  slug,
  display_name as "displayName",
  tagline,
  bio,
  avatar_media_id as "avatarMediaId",
  banner_media_id as "bannerMediaId",
  public_location_label as "publicLocationLabel",
  primary_language as "primaryLanguage",
  translation_contributions_enabled as "translationContributionsEnabled",
  commission_enabled as "commissionEnabled",
  status,
  review_status as "reviewStatus",
  review_note as "reviewNote",
  published_at as "publishedAt",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

const mapProfileRow = (row: Record<string, unknown>): CreatorProfileRow => ({
  id: String(row.id),
  userId: String(row.userId),
  slug: String(row.slug),
  displayName: String(row.displayName),
  tagline: row.tagline === null ? null : String(row.tagline),
  bio: row.bio === null ? null : String(row.bio),
  avatarMediaId: row.avatarMediaId === null ? null : String(row.avatarMediaId),
  bannerMediaId: row.bannerMediaId === null ? null : String(row.bannerMediaId),
  publicLocationLabel: row.publicLocationLabel === null ? null : String(row.publicLocationLabel),
  primaryLanguage: row.primaryLanguage === null ? null : String(row.primaryLanguage),
  translationContributionsEnabled: Boolean(row.translationContributionsEnabled),
  commissionEnabled: Boolean(row.commissionEnabled),
  status: row.status as CreatorStatus,
  reviewStatus: row.reviewStatus as CreatorProfileRow['reviewStatus'],
  reviewNote: row.reviewNote === null ? null : String(row.reviewNote),
  publishedAt: toIsoString(row.publishedAt),
  createdAt: String(toIsoString(row.createdAt)),
  updatedAt: String(toIsoString(row.updatedAt)),
});

const rowsFrom = async <T>(query: SQL, executor: Executor = db) => {
  const result = await executor.execute(query);
  return Array.from(result as Iterable<T>);
};

const firstRowFrom = async <T>(query: SQL, executor: Executor = db) => {
  const rows = await rowsFrom<T>(query, executor);
  return rows[0] ?? null;
};

export const findPublishedCreators = async (limit: number) => {
  const rows = await rowsFrom<Record<string, unknown>>(sql`
    select ${profileSelect}
    from creator_profiles
    where status = 'published'
    order by published_at desc nulls last, created_at desc
    limit ${limit}
  `);
  return rows.map(mapProfileRow);
};

export const findCreatorBySlug = async (slug: string) => {
  const row = await firstRowFrom<Record<string, unknown>>(sql`
    select ${profileSelect}
    from creator_profiles
    where slug = ${slug}
    limit 1
  `);
  return row ? mapProfileRow(row) : null;
};

export const findCreatorById = async (id: string) => {
  const row = await firstRowFrom<Record<string, unknown>>(sql`
    select ${profileSelect}
    from creator_profiles
    where id = ${id}
    limit 1
  `);
  return row ? mapProfileRow(row) : null;
};

export const findCreatorByUserId = async (userId: string) => {
  const row = await firstRowFrom<Record<string, unknown>>(sql`
    select ${profileSelect}
    from creator_profiles
    where user_id = ${userId}
    limit 1
  `);
  return row ? mapProfileRow(row) : null;
};

export const insertCreatorProfile = async (input: CreateCreatorProfileInput, userId: string) => {
  const row = await firstRowFrom<Record<string, unknown>>(sql`
    insert into creator_profiles (
      user_id,
      slug,
      display_name,
      status,
      review_status
    )
    values (
      ${userId},
      ${input.slug},
      ${input.displayName},
      'draft',
      'pending'
    )
    returning ${profileSelect}
  `);
  return row ? mapProfileRow(row) : null;
};

export const updateCreatorProfile = async (
  creatorId: string,
  patch: UpdateCreatorProfileInput & {
    status?: CreatorStatus;
    publishedAt?: string | null;
    reviewStatus?: CreatorProfileRow['reviewStatus'];
    reviewNote?: string | null;
  }
) => {
  const assignments: SQL[] = [];
  if ('displayName' in patch) assignments.push(sql`display_name = ${patch.displayName}`);
  if ('tagline' in patch) assignments.push(sql`tagline = ${patch.tagline}`);
  if ('bio' in patch) assignments.push(sql`bio = ${patch.bio}`);
  if ('avatarMediaId' in patch) assignments.push(sql`avatar_media_id = ${patch.avatarMediaId}`);
  if ('bannerMediaId' in patch) assignments.push(sql`banner_media_id = ${patch.bannerMediaId}`);
  if ('publicLocationLabel' in patch) {
    assignments.push(sql`public_location_label = ${patch.publicLocationLabel}`);
  }
  if ('primaryLanguage' in patch)
    assignments.push(sql`primary_language = ${patch.primaryLanguage}`);
  if ('translationContributionsEnabled' in patch) {
    assignments.push(
      sql`translation_contributions_enabled = ${patch.translationContributionsEnabled}`
    );
  }
  if ('commissionEnabled' in patch)
    assignments.push(sql`commission_enabled = ${patch.commissionEnabled}`);
  if ('status' in patch) assignments.push(sql`status = ${patch.status}`);
  if ('publishedAt' in patch) assignments.push(sql`published_at = ${patch.publishedAt}`);
  if ('reviewStatus' in patch) assignments.push(sql`review_status = ${patch.reviewStatus}`);
  if ('reviewNote' in patch) assignments.push(sql`review_note = ${patch.reviewNote}`);

  if (assignments.length === 0) return findCreatorById(creatorId);

  const row = await firstRowFrom<Record<string, unknown>>(sql`
    update creator_profiles
    set ${sql.join(assignments, sql`, `)}, updated_at = now()
    where id = ${creatorId}
    returning ${profileSelect}
  `);
  return row ? mapProfileRow(row) : null;
};

export const replaceCreatorCategories = async (
  creatorId: string,
  categoryKeys: CreatorCategoryKey[]
) => {
  await db.transaction(async (tx) => {
    await tx.execute(sql`delete from creator_profile_categories where creator_id = ${creatorId}`);
    for (const [sortOrder, key] of categoryKeys.entries()) {
      await tx.execute(sql`
        insert into creator_profile_categories (creator_id, category_id, sort_order)
        select ${creatorId}, id, ${sortOrder}
        from creator_categories
        where key = ${key} and is_active = true
      `);
    }
  });
};

export const listCreatorCategoryKeys = async (creatorId: string) => {
  const rows = await rowsFrom<{ key: CreatorCategoryKey }>(sql`
    select c.key
    from creator_profile_categories pc
    join creator_categories c on c.id = pc.category_id
    where pc.creator_id = ${creatorId}
    order by pc.sort_order asc, c.sort_order asc, c.key asc
  `);
  return rows.map((row) => row.key);
};

export const replaceCreatorTags = async (creatorId: string, tags: string[]) => {
  await db.transaction(async (tx) => {
    await tx.execute(sql`delete from creator_tags where creator_id = ${creatorId}`);
    for (const label of tags) {
      await tx.execute(sql`
        insert into creator_tags (creator_id, label, normalized_label)
        values (${creatorId}, ${label}, ${label.toLowerCase()})
      `);
    }
  });
};

export const listCreatorTags = async (creatorId: string) => {
  const rows = await rowsFrom<{ label: string }>(sql`
    select label
    from creator_tags
    where creator_id = ${creatorId}
    order by label asc
  `);
  return rows.map((row) => row.label);
};

export const replaceCreatorLinks = async (creatorId: string, input: ReplaceCreatorLinksInput) => {
  await db.transaction(async (tx) => {
    await tx.execute(sql`delete from creator_links where creator_id = ${creatorId}`);
    for (const link of input.links) {
      await tx.execute(sql`
        insert into creator_links (creator_id, kind, label, url, sort_order)
        values (${creatorId}, ${link.kind}, ${link.label}, ${link.url}, ${link.sortOrder})
      `);
    }
  });
};

export const listCreatorLinks = async (creatorId: string) => {
  return rowsFrom<CreatorLinkRow>(sql`
    select id, kind, label, url, sort_order as "sortOrder"
    from creator_links
    where creator_id = ${creatorId}
    order by sort_order asc, created_at asc
  `);
};

export const replaceCreatorPortfolio = async (
  creatorId: string,
  input: ReplaceCreatorPortfolioInput
) => {
  await db.transaction(async (tx) => {
    await tx.execute(sql`delete from creator_portfolio_items where creator_id = ${creatorId}`);
    for (const item of input.portfolioItems) {
      await tx.execute(sql`
        insert into creator_portfolio_items (
          creator_id,
          title,
          description,
          url,
          media_id,
          role,
          completed_at,
          sort_order,
          visibility
        )
        values (
          ${creatorId},
          ${item.title},
          ${item.description ?? null},
          ${item.url ?? null},
          ${item.mediaId ?? null},
          ${item.role ?? null},
          ${item.completedAt ?? null},
          ${item.sortOrder},
          ${item.visibility}
        )
      `);
    }
  });
};

export const listPortfolioItems = async (creatorId: string, publicOnly = false) => {
  const rows = await rowsFrom<CreatorPortfolioItemRow>(sql`
    select
      id,
      title,
      description,
      url,
      media_id as "mediaId",
      role,
      completed_at as "completedAt",
      sort_order as "sortOrder",
      visibility
    from creator_portfolio_items
    where creator_id = ${creatorId}
      and (${publicOnly} = false or visibility = 'public')
    order by sort_order asc, created_at asc
  `);

  return rows.map((row) => ({
    ...row,
    completedAt: toIsoString(row.completedAt),
  }));
};

export const listProfileSections = async (creatorId: string, publicOnly = false) => {
  return rowsFrom<CreatorProfileSectionRow>(sql`
    select
      id,
      kind,
      title,
      body,
      sort_order as "sortOrder",
      visibility
    from creator_profile_sections
    where creator_id = ${creatorId}
      and (${publicOnly} = false or visibility = 'public')
    order by sort_order asc, created_at asc
  `);
};

export const insertFollow = async (creatorId: string, userId: string) => {
  await db.execute(sql`
    insert into follows (creator_id, user_id)
    values (${creatorId}, ${userId})
    on conflict (creator_id, user_id) do nothing
  `);
};

export const deleteFollow = async (creatorId: string, userId: string) => {
  await db.execute(sql`
    delete from follows
    where creator_id = ${creatorId} and user_id = ${userId}
  `);
};

export const countFollowers = async (creatorId: string) => {
  const row = await firstRowFrom<{ count: string | number }>(sql`
    select count(*) as count
    from follows
    where creator_id = ${creatorId}
  `);
  return Number(row?.count ?? 0);
};

export const isFollowingCreator = async (creatorId: string, userId: string) => {
  const row = await firstRowFrom<{ exists: boolean }>(sql`
    select exists(
      select 1
      from follows
      where creator_id = ${creatorId} and user_id = ${userId}
    ) as exists
  `);
  return Boolean(row?.exists);
};
