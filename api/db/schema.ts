import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const commonColumns = {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdateFn(() => new Date())
    .notNull(),
};

export const users = pgTable('users', {
  ...commonColumns,
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  passwordHash: text('password_hash'),
  name: text('name').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at'),
});

export const userIdentities = pgTable(
  'user_identities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    subject: text('subject').notNull(),
    email: text('email'),
    emailVerified: boolean('email_verified').default(false).notNull(),
    claimsHash: text('claims_hash').notNull(),
    linkedAt: timestamp('linked_at').defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
  },
  (table) => ({
    providerSubjectUniqueIdx: uniqueIndex('uid_provider_subject_uidx').on(
      table.provider,
      table.subject
    ),
    userIdIdx: index('uid_user_id_idx').on(table.userId),
  })
);

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionTokenHash: text('session_token_hash').notNull().unique(),
    refreshTokenCiphertext: text('refresh_token_ciphertext'),
    accessTokenCiphertext: text('access_token_ciphertext').notNull(),
    idTokenCiphertext: text('id_token_ciphertext').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    refreshedAt: timestamp('refreshed_at').defaultNow().notNull(),
    revokedAt: timestamp('revoked_at'),
    userAgent: text('user_agent'),
    ipHash: text('ip_hash'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    sessionTokenHashIdx: uniqueIndex('us_session_token_hash_uidx').on(table.sessionTokenHash),
    userIdIdx: index('us_user_id_idx').on(table.userId),
  })
);

export const authLoginStates = pgTable(
  'auth_login_states',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stateHash: text('state_hash').notNull().unique(),
    nonceCiphertext: text('nonce_ciphertext').notNull(),
    codeVerifierCiphertext: text('code_verifier_ciphertext').notNull(),
    redirectUri: text('redirect_uri').notNull(),
    returnTo: text('return_to').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    consumedAt: timestamp('consumed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    stateHashIdx: uniqueIndex('als_state_hash_uidx').on(table.stateHash),
  })
);

export const authEvents = pgTable(
  'auth_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    provider: text('provider').notNull(),
    eventType: text('event_type').notNull(),
    result: text('result').notNull(),
    reason: text('reason'),
    ipHash: text('ip_hash'),
    userAgent: text('user_agent'),
    occurredAt: timestamp('occurred_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('ae_user_id_idx').on(table.userId),
    occurredAtIdx: index('ae_occurred_at_idx').on(table.occurredAt),
  })
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    token: text('token').notNull().unique(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('rt_user_id_idx').on(table.userId),
  })
);

export const userExternalAccounts = pgTable(
  'user_external_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // 'google', 'github'
    externalId: text('external_id').notNull(),
    email: text('email'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    providerExternalIdUniqueIdx: uniqueIndex('uex_provider_ext_uidx').on(
      table.provider,
      table.externalId
    ),
    userIdIdx: index('uex_user_id_idx').on(table.userId),
  })
);

export const threads = pgTable(
  'threads',
  {
    ...commonColumns,
    title: text('title').notNull(),
    content: text('content').notNull(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    authorIdIdx: index('threads_author_id_idx').on(table.authorId),
  })
);

export const comments = pgTable(
  'comments',
  {
    ...commonColumns,
    threadId: uuid('thread_id')
      .notNull()
      .references(() => threads.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): AnyPgColumn => comments.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    threadIdIdx: index('comments_thread_id_idx').on(table.threadId),
    authorIdIdx: index('comments_author_id_idx').on(table.authorId),
  })
);

export const mediaAssets = pgTable(
  'media_assets',
  {
    ...commonColumns,
    ownerId: uuid('owner_id').notNull(),
    ownerType: text('owner_type').default('user').notNull(),
    mediaKind: text('media_kind').default('unknown').notNull(),
    status: text('status').default('pending_upload').notNull(),
    visibility: text('visibility').default('private').notNull(),
    providerKey: text('provider_key').notNull(),
    storageHandle: text('storage_handle').notNull(),
    originalFilename: text('original_filename'),
    mimeType: text('mime_type'),
    byteSize: integer('byte_size'),
    checksum: text('checksum'),
    width: integer('width'),
    height: integer('height'),
    durationMs: integer('duration_ms'),
    failureReason: text('failure_reason'),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    ownerIdx: index('media_assets_owner_idx').on(table.ownerType, table.ownerId),
    statusIdx: index('media_assets_status_idx').on(table.status),
  })
);

export const mediaUploadIntents = pgTable(
  'media_upload_intents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    providerKey: text('provider_key').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    maxBytes: integer('max_bytes').notNull(),
    allowedMimeTypes: jsonb('allowed_mime_types').notNull(),
    status: text('status').default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    mediaIdIdx: index('media_upload_intents_media_id_idx').on(table.mediaId),
  })
);

export const mediaVariants = pgTable(
  'media_variants',
  {
    ...commonColumns,
    mediaId: uuid('media_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    variantKind: text('variant_kind').notNull(),
    providerKey: text('provider_key').notNull(),
    storageHandle: text('storage_handle').notNull(),
    mimeType: text('mime_type'),
    byteSize: integer('byte_size'),
    width: integer('width'),
    height: integer('height'),
    durationMs: integer('duration_ms'),
  },
  (table) => ({
    mediaVariantIdx: index('media_variants_media_kind_idx').on(table.mediaId, table.variantKind),
  })
);

export const mediaExternalSources = pgTable(
  'media_external_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    sourceType: text('source_type').notNull(),
    url: text('url').notNull(),
    providerName: text('provider_name'),
    embedHtml: text('embed_html'),
    thumbnailUrl: text('thumbnail_url'),
    metadata: jsonb('metadata'),
    lastFetchedAt: timestamp('last_fetched_at'),
  },
  (table) => ({
    mediaIdIdx: index('media_external_sources_media_id_idx').on(table.mediaId),
  })
);

export const mediaUsages = pgTable(
  'media_usages',
  {
    ...commonColumns,
    mediaId: uuid('media_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    usageType: text('usage_type').notNull(),
    targetType: text('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
  },
  (table) => ({
    mediaUsageUniqueIdx: uniqueIndex('media_usages_media_target_uidx').on(
      table.mediaId,
      table.usageType,
      table.targetType,
      table.targetId
    ),
  })
);

export const mediaScanResults = pgTable(
  'media_scan_results',
  {
    ...commonColumns,
    mediaId: uuid('media_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    scanType: text('scan_type').notNull(),
    status: text('status').default('pending').notNull(),
    verdict: text('verdict').default('unknown').notNull(),
    providerKey: text('provider_key'),
    details: jsonb('details'),
    scannedAt: timestamp('scanned_at'),
  },
  (table) => ({
    mediaScanIdx: index('media_scan_results_media_type_idx').on(table.mediaId, table.scanType),
  })
);

export const blockedTerms = pgTable(
  'blocked_terms',
  {
    ...commonColumns,
    language: text('language').default('und').notNull(),
    locale: text('locale'),
    script: text('script'),
    category: text('category').notNull(),
    pattern: text('pattern').notNull(),
    normalizedPattern: text('normalized_pattern').notNull(),
    matchType: text('match_type').notNull(),
    severity: text('severity').notNull(),
    decision: text('decision').notNull(),
    contextPolicy: text('context_policy').default('always').notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  (table) => ({
    enabledIdx: index('blocked_terms_enabled_idx').on(table.enabled),
    normalizedIdx: index('blocked_terms_normalized_idx').on(table.normalizedPattern),
  })
);

export const allowedTerms = pgTable(
  'allowed_terms',
  {
    ...commonColumns,
    language: text('language').default('und').notNull(),
    locale: text('locale'),
    pattern: text('pattern').notNull(),
    normalizedPattern: text('normalized_pattern').notNull(),
    matchType: text('match_type').notNull(),
    reason: text('reason'),
    enabled: boolean('enabled').default(true).notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  (table) => ({
    enabledIdx: index('allowed_terms_enabled_idx').on(table.enabled),
    normalizedIdx: index('allowed_terms_normalized_idx').on(table.normalizedPattern),
  })
);

export const contentSafetyChecks = pgTable(
  'content_safety_checks',
  {
    ...commonColumns,
    targetType: text('target_type').notNull(),
    targetId: uuid('target_id'),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    language: text('language'),
    source: text('source'),
    textHash: text('text_hash').notNull(),
    decision: text('decision').notNull(),
    maxSeverity: text('max_severity').notNull(),
    ruleVersion: integer('rule_version').default(1).notNull(),
    checkedAt: timestamp('checked_at').defaultNow().notNull(),
  },
  (table) => ({
    targetIdx: index('content_safety_checks_target_idx').on(table.targetType, table.targetId),
    actorIdx: index('content_safety_checks_actor_idx').on(table.actorId),
  })
);

export const blockedTermMatches = pgTable(
  'blocked_term_matches',
  {
    ...commonColumns,
    checkId: uuid('check_id')
      .notNull()
      .references(() => contentSafetyChecks.id, { onDelete: 'cascade' }),
    targetType: text('target_type').notNull(),
    targetId: uuid('target_id'),
    termId: uuid('term_id').references(() => blockedTerms.id, { onDelete: 'set null' }),
    matchedTextHash: text('matched_text_hash').notNull(),
    matchedTextPreview: text('matched_text_preview').notNull(),
    startOffset: integer('start_offset').notNull(),
    endOffset: integer('end_offset').notNull(),
    severity: text('severity').notNull(),
    decision: text('decision').notNull(),
  },
  (table) => ({
    checkIdIdx: index('blocked_term_matches_check_id_idx').on(table.checkId),
  })
);

export const contentSafetyReviews = pgTable(
  'content_safety_reviews',
  {
    ...commonColumns,
    targetType: text('target_type').notNull(),
    targetId: uuid('target_id'),
    checkId: uuid('check_id').references(() => contentSafetyChecks.id, { onDelete: 'set null' }),
    status: text('status').default('open').notNull(),
    trustCaseId: uuid('trust_case_id'),
    decision: text('decision'),
    reason: text('reason'),
    decidedAt: timestamp('decided_at'),
  },
  (table) => ({
    statusIdx: index('content_safety_reviews_status_idx').on(table.status),
    targetIdx: index('content_safety_reviews_target_idx').on(table.targetType, table.targetId),
  })
);

export const contentSafetyAppeals = pgTable(
  'content_safety_appeals',
  {
    ...commonColumns,
    reviewId: uuid('review_id')
      .notNull()
      .references(() => contentSafetyReviews.id, { onDelete: 'cascade' }),
    requesterId: uuid('requester_id').references(() => users.id, { onDelete: 'set null' }),
    reason: text('reason').notNull(),
    status: text('status').default('open').notNull(),
    decidedAt: timestamp('decided_at'),
  },
  (table) => ({
    reviewIdIdx: index('content_safety_appeals_review_id_idx').on(table.reviewId),
  })
);

export const contentSafetyRescanJobs = pgTable(
  'content_safety_rescan_jobs',
  {
    ...commonColumns,
    scope: text('scope').notNull(),
    status: text('status').default('queued').notNull(),
    ruleVersionFrom: integer('rule_version_from'),
    ruleVersionTo: integer('rule_version_to').notNull(),
    startedAt: timestamp('started_at'),
    finishedAt: timestamp('finished_at'),
  },
  (table) => ({
    statusIdx: index('content_safety_rescan_jobs_status_idx').on(table.status),
  })
);

export const trustReports = pgTable(
  'trust_reports',
  {
    ...commonColumns,
    reporterId: uuid('reporter_id').references(() => users.id, { onDelete: 'set null' }),
    targetType: text('target_type').notNull(),
    targetId: uuid('target_id'),
    reason: text('reason').notNull(),
    description: text('description'),
    status: text('status').default('open').notNull(),
    priority: text('priority').default('normal').notNull(),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    targetIdx: index('trust_reports_target_idx').on(table.targetType, table.targetId),
    statusIdx: index('trust_reports_status_idx').on(table.status),
  })
);

export const trustCases = pgTable(
  'trust_cases',
  {
    ...commonColumns,
    caseType: text('case_type').notNull(),
    status: text('status').default('open').notNull(),
    severity: text('severity').default('medium').notNull(),
    priority: text('priority').default('normal').notNull(),
    primaryTargetType: text('primary_target_type').notNull(),
    primaryTargetId: uuid('primary_target_id'),
    assignedStaffId: uuid('assigned_staff_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    openedByUserId: uuid('opened_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    resolvedAt: timestamp('resolved_at'),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    statusIdx: index('trust_cases_status_idx').on(table.status),
    targetIdx: index('trust_cases_target_idx').on(table.primaryTargetType, table.primaryTargetId),
    assignedStaffIdx: index('trust_cases_assigned_staff_idx').on(table.assignedStaffId),
  })
);

export const trustCaseReports = pgTable(
  'trust_case_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => trustCases.id, { onDelete: 'cascade' }),
    reportId: uuid('report_id')
      .notNull()
      .references(() => trustReports.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    caseReportUniqueIdx: uniqueIndex('trust_case_reports_case_report_uidx').on(
      table.caseId,
      table.reportId
    ),
  })
);

export const trustCaseEvents = pgTable(
  'trust_case_events',
  {
    ...commonColumns,
    caseId: uuid('case_id')
      .notNull()
      .references(() => trustCases.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    summary: text('summary').notNull(),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    caseIdIdx: index('trust_case_events_case_id_idx').on(table.caseId),
  })
);

export const trustStaffActions = pgTable(
  'trust_staff_actions',
  {
    ...commonColumns,
    caseId: uuid('case_id')
      .notNull()
      .references(() => trustCases.id, { onDelete: 'cascade' }),
    staffUserId: uuid('staff_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    actionType: text('action_type').notNull(),
    targetType: text('target_type'),
    targetId: uuid('target_id'),
    reason: text('reason'),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    caseIdIdx: index('trust_staff_actions_case_id_idx').on(table.caseId),
    staffIdx: index('trust_staff_actions_staff_idx').on(table.staffUserId),
  })
);

export const trustInternalNotes = pgTable(
  'trust_internal_notes',
  {
    ...commonColumns,
    caseId: uuid('case_id')
      .notNull()
      .references(() => trustCases.id, { onDelete: 'cascade' }),
    staffUserId: uuid('staff_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    visibility: text('visibility').default('staff_only').notNull(),
  },
  (table) => ({
    caseIdIdx: index('trust_internal_notes_case_id_idx').on(table.caseId),
  })
);

export const trustDecisions = pgTable(
  'trust_decisions',
  {
    ...commonColumns,
    caseId: uuid('case_id')
      .notNull()
      .references(() => trustCases.id, { onDelete: 'cascade' }),
    decisionType: text('decision_type').notNull(),
    targetType: text('target_type'),
    targetId: uuid('target_id'),
    creatorVisibleSummary: text('creator_visible_summary'),
    userVisibleSummary: text('user_visible_summary'),
    internalRationale: text('internal_rationale').notNull(),
    decidedByUserId: uuid('decided_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    decidedAt: timestamp('decided_at').defaultNow().notNull(),
  },
  (table) => ({
    caseIdIdx: index('trust_decisions_case_id_idx').on(table.caseId),
  })
);

export const trustAppeals = pgTable(
  'trust_appeals',
  {
    ...commonColumns,
    caseId: uuid('case_id')
      .notNull()
      .references(() => trustCases.id, { onDelete: 'cascade' }),
    requesterId: uuid('requester_id').references(() => users.id, { onDelete: 'set null' }),
    reason: text('reason').notNull(),
    status: text('status').default('open').notNull(),
    resolvedByUserId: uuid('resolved_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    resolutionReason: text('resolution_reason'),
    resolvedAt: timestamp('resolved_at'),
  },
  (table) => ({
    statusIdx: index('trust_appeals_status_idx').on(table.status),
    caseIdIdx: index('trust_appeals_case_id_idx').on(table.caseId),
  })
);

export const systemAuditEvents = pgTable(
  'system_audit_events',
  {
    ...commonColumns,
    sourceDomain: text('source_domain').notNull(),
    eventType: text('event_type').notNull(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    targetType: text('target_type'),
    targetId: uuid('target_id'),
    summary: text('summary').notNull(),
    metadata: jsonb('metadata'),
    occurredAt: timestamp('occurred_at').defaultNow().notNull(),
  },
  (table) => ({
    sourceEventIdx: index('system_audit_events_source_event_idx').on(
      table.sourceDomain,
      table.eventType
    ),
    actorIdx: index('system_audit_events_actor_idx').on(table.actorId),
    targetIdx: index('system_audit_events_target_idx').on(table.targetType, table.targetId),
  })
);

export const creatorProfiles = pgTable(
  'creator_profiles',
  {
    ...commonColumns,
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    displayName: text('display_name').notNull(),
    tagline: text('tagline'),
    bio: text('bio'),
    avatarMediaId: uuid('avatar_media_id').references(() => mediaAssets.id, {
      onDelete: 'set null',
    }),
    bannerMediaId: uuid('banner_media_id').references(() => mediaAssets.id, {
      onDelete: 'set null',
    }),
    publicLocationLabel: text('public_location_label'),
    primaryLanguage: text('primary_language'),
    translationContributionsEnabled: boolean('translation_contributions_enabled')
      .default(false)
      .notNull(),
    commissionEnabled: boolean('commission_enabled').default(false).notNull(),
    status: text('status').default('draft').notNull(),
    reviewStatus: text('review_status').default('pending').notNull(),
    reviewNote: text('review_note'),
    publishedAt: timestamp('published_at'),
  },
  (table) => ({
    userIdUniqueIdx: uniqueIndex('creator_profiles_user_id_uidx').on(table.userId),
    slugUniqueIdx: uniqueIndex('creator_profiles_slug_uidx').on(table.slug),
    statusIdx: index('creator_profiles_status_idx').on(table.status),
  })
);

export const creatorCategories = pgTable(
  'creator_categories',
  {
    ...commonColumns,
    key: text('key').notNull().unique(),
    label: text('label').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (table) => ({
    activeSortIdx: index('creator_categories_active_sort_idx').on(table.isActive, table.sortOrder),
  })
);

export const creatorProfileCategories = pgTable(
  'creator_profile_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => creatorCategories.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => ({
    creatorCategoryUniqueIdx: uniqueIndex('creator_profile_categories_uidx').on(
      table.creatorId,
      table.categoryId
    ),
  })
);

export const creatorTags = pgTable(
  'creator_tags',
  {
    ...commonColumns,
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    normalizedLabel: text('normalized_label').notNull(),
  },
  (table) => ({
    creatorTagUniqueIdx: uniqueIndex('creator_tags_creator_label_uidx').on(
      table.creatorId,
      table.normalizedLabel
    ),
  })
);

export const creatorLinks = pgTable(
  'creator_links',
  {
    ...commonColumns,
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    label: text('label').notNull(),
    url: text('url').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => ({
    creatorIdIdx: index('creator_links_creator_id_idx').on(table.creatorId),
  })
);

export const creatorPortfolioItems = pgTable(
  'creator_portfolio_items',
  {
    ...commonColumns,
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    url: text('url'),
    mediaId: uuid('media_id').references(() => mediaAssets.id, { onDelete: 'set null' }),
    role: text('role'),
    completedAt: timestamp('completed_at'),
    sortOrder: integer('sort_order').default(0).notNull(),
    visibility: text('visibility').default('public').notNull(),
  },
  (table) => ({
    creatorIdIdx: index('creator_portfolio_items_creator_id_idx').on(table.creatorId),
  })
);

export const creatorProfileSections = pgTable(
  'creator_profile_sections',
  {
    ...commonColumns,
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    title: text('title'),
    body: text('body').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    visibility: text('visibility').default('public').notNull(),
  },
  (table) => ({
    creatorIdIdx: index('creator_profile_sections_creator_id_idx').on(table.creatorId),
  })
);

export const follows = pgTable(
  'follows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    creatorUserUniqueIdx: uniqueIndex('follows_creator_user_uidx').on(
      table.creatorId,
      table.userId
    ),
    userIdIdx: index('follows_user_id_idx').on(table.userId),
  })
);

export const membershipTiers = pgTable(
  'membership_tiers',
  {
    ...commonColumns,
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    priceAmount: integer('price_amount').notNull(),
    currency: text('currency').notNull(),
    billingInterval: text('billing_interval').notNull(),
    visibility: text('visibility').default('draft').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    coverMediaId: uuid('cover_media_id'),
    maxMembers: integer('max_members'),
    ageRating: text('age_rating').default('all_ages').notNull(),
  },
  (table) => ({
    creatorIdIdx: index('membership_tiers_creator_id_idx').on(table.creatorId),
    visibilityIdx: index('membership_tiers_visibility_idx').on(table.visibility),
  })
);

export const tierBenefits = pgTable(
  'tier_benefits',
  {
    ...commonColumns,
    tierId: uuid('tier_id')
      .notNull()
      .references(() => membershipTiers.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    label: text('label').notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').default(0).notNull(),
    deliveryHint: text('delivery_hint'),
    isHighlighted: boolean('is_highlighted').default(false).notNull(),
  },
  (table) => ({
    tierIdIdx: index('tier_benefits_tier_id_idx').on(table.tierId),
  })
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    ...commonColumns,
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    tierId: uuid('tier_id')
      .notNull()
      .references(() => membershipTiers.id, { onDelete: 'restrict' }),
    status: text('status').notNull(),
    billingModel: text('billing_model').default('subscription').notNull(),
    billingInterval: text('billing_interval').default('monthly').notNull(),
    currentPeriodStart: timestamp('current_period_start').notNull(),
    currentPeriodEnd: timestamp('current_period_end').notNull(),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
    gracePeriodEndsAt: timestamp('grace_period_ends_at'),
    provider: text('provider'),
    providerCustomerId: text('provider_customer_id'),
    providerSubscriptionId: text('provider_subscription_id'),
    priceVersionId: uuid('price_version_id'),
  },
  (table) => ({
    userCreatorIdx: index('subscriptions_user_creator_idx').on(table.userId, table.creatorId),
    providerSubscriptionIdx: uniqueIndex('subscriptions_provider_sub_uidx').on(
      table.provider,
      table.providerSubscriptionId
    ),
  })
);

export const subscriptionEvents = pgTable(
  'subscription_events',
  {
    ...commonColumns,
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id, {
      onDelete: 'cascade',
    }),
    eventType: text('event_type').notNull(),
    source: text('source').notNull(),
    sourceEventId: text('source_event_id').notNull(),
    occurredAt: timestamp('occurred_at').notNull(),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    sourceEventIdx: uniqueIndex('subscription_events_source_event_uidx').on(
      table.source,
      table.sourceEventId
    ),
  })
);

export const entitlements = pgTable(
  'entitlements',
  {
    ...commonColumns,
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    targetType: text('target_type').notNull(),
    targetId: uuid('target_id'),
    sourceType: text('source_type').notNull(),
    sourceId: uuid('source_id'),
    startsAt: timestamp('starts_at').notNull(),
    expiresAt: timestamp('expires_at'),
    revokedAt: timestamp('revoked_at'),
    revokeReason: text('revoke_reason'),
  },
  (table) => ({
    userTargetIdx: index('entitlements_user_target_idx').on(
      table.userId,
      table.targetType,
      table.targetId
    ),
    creatorIdx: index('entitlements_creator_id_idx').on(table.creatorId),
  })
);

export const complimentaryMemberships = pgTable(
  'complimentary_memberships',
  {
    ...commonColumns,
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    grantedByUserId: uuid('granted_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tierId: uuid('tier_id')
      .notNull()
      .references(() => membershipTiers.id, { onDelete: 'restrict' }),
    startsAt: timestamp('starts_at').notNull(),
    expiresAt: timestamp('expires_at'),
    reason: text('reason'),
    status: text('status').default('active').notNull(),
  },
  (table) => ({
    creatorUserIdx: index('complimentary_memberships_creator_user_idx').on(
      table.creatorId,
      table.userId
    ),
  })
);

export const supporterNotes = pgTable(
  'supporter_notes',
  {
    ...commonColumns,
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    supporterUserId: uuid('supporter_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    note: text('note').notNull(),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    creatorSupporterIdx: uniqueIndex('supporter_notes_creator_supporter_uidx').on(
      table.creatorId,
      table.supporterUserId
    ),
  })
);

export const paymentCustomers = pgTable(
  'payment_customers',
  {
    ...commonColumns,
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerCustomerId: text('provider_customer_id').notNull(),
    defaultCurrency: text('default_currency').default('JPY').notNull(),
  },
  (table) => ({
    userProviderUniqueIdx: uniqueIndex('payment_customers_user_provider_uidx').on(
      table.userId,
      table.provider
    ),
    providerCustomerUniqueIdx: uniqueIndex('payment_customers_provider_customer_uidx').on(
      table.provider,
      table.providerCustomerId
    ),
  })
);

export const checkoutSessions = pgTable(
  'checkout_sessions',
  {
    ...commonColumns,
    provider: text('provider').notNull(),
    purpose: text('purpose').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    tierId: uuid('tier_id').references(() => membershipTiers.id, { onDelete: 'set null' }),
    postId: uuid('post_id'),
    streamId: uuid('stream_id'),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull(),
    status: text('status').default('pending').notNull(),
    providerCheckoutSessionId: text('provider_checkout_session_id').notNull(),
    url: text('url'),
    successUrl: text('success_url').notNull(),
    cancelUrl: text('cancel_url').notNull(),
    expiresAt: timestamp('expires_at'),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    providerSessionUniqueIdx: uniqueIndex('checkout_sessions_provider_session_uidx').on(
      table.provider,
      table.providerCheckoutSessionId
    ),
    userIdIdx: index('checkout_sessions_user_id_idx').on(table.userId),
    creatorIdIdx: index('checkout_sessions_creator_id_idx').on(table.creatorId),
  })
);

export const paymentEvents = pgTable(
  'payment_events',
  {
    ...commonColumns,
    provider: text('provider').notNull(),
    providerEventId: text('provider_event_id').notNull(),
    type: text('type').notNull(),
    payload: jsonb('payload').notNull(),
    rawBodyHash: text('raw_body_hash').notNull(),
    processingStatus: text('processing_status').default('received').notNull(),
    receivedAt: timestamp('received_at').defaultNow().notNull(),
    processedAt: timestamp('processed_at'),
    error: text('error'),
  },
  (table) => ({
    providerEventUniqueIdx: uniqueIndex('payment_events_provider_event_uidx').on(
      table.provider,
      table.providerEventId
    ),
    statusIdx: index('payment_events_status_idx').on(table.processingStatus),
  })
);

export const internalPaymentEvents = pgTable(
  'internal_payment_events',
  {
    ...commonColumns,
    paymentEventId: uuid('payment_event_id').references(() => paymentEvents.id, {
      onDelete: 'cascade',
    }),
    eventType: text('event_type').notNull(),
    targetDomain: text('target_domain').notNull(),
    targetId: uuid('target_id'),
    processedAt: timestamp('processed_at'),
    payload: jsonb('payload').notNull(),
  },
  (table) => ({
    eventTypeIdx: index('internal_payment_events_event_type_idx').on(table.eventType),
  })
);

export const payments = pgTable(
  'payments',
  {
    ...commonColumns,
    provider: text('provider').notNull(),
    providerPaymentId: text('provider_payment_id').notNull(),
    payerId: uuid('payer_id').references(() => users.id, { onDelete: 'set null' }),
    creatorId: uuid('creator_id').references(() => creatorProfiles.id, { onDelete: 'set null' }),
    checkoutSessionId: uuid('checkout_session_id').references(() => checkoutSessions.id, {
      onDelete: 'set null',
    }),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull(),
    status: text('status').notNull(),
    paidAt: timestamp('paid_at'),
  },
  (table) => ({
    providerPaymentUniqueIdx: uniqueIndex('payments_provider_payment_uidx').on(
      table.provider,
      table.providerPaymentId
    ),
  })
);

export const paymentLedgerEntries = pgTable(
  'payment_ledger_entries',
  {
    ...commonColumns,
    creatorId: uuid('creator_id').references(() => creatorProfiles.id, { onDelete: 'set null' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    provider: text('provider').notNull(),
    providerObjectId: text('provider_object_id').notNull(),
    sourceType: text('source_type').notNull(),
    sourceId: uuid('source_id'),
    entryType: text('entry_type').notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull(),
    occurredAt: timestamp('occurred_at').notNull(),
    availableAt: timestamp('available_at'),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    creatorOccurredIdx: index('payment_ledger_creator_occurred_idx').on(
      table.creatorId,
      table.occurredAt
    ),
  })
);

export const tips = pgTable(
  'tips',
  {
    ...commonColumns,
    payerId: uuid('payer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    postId: uuid('post_id'),
    streamId: uuid('stream_id'),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull(),
    message: text('message'),
    visibility: text('visibility').default('creator_only').notNull(),
    status: text('status').default('pending').notNull(),
    providerPaymentId: text('provider_payment_id'),
    checkoutSessionId: uuid('checkout_session_id').references(() => checkoutSessions.id, {
      onDelete: 'set null',
    }),
    paidAt: timestamp('paid_at'),
  },
  (table) => ({
    creatorIdIdx: index('tips_creator_id_idx').on(table.creatorId),
  })
);

export const refunds = pgTable(
  'refunds',
  {
    ...commonColumns,
    paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
    creatorId: uuid('creator_id').references(() => creatorProfiles.id, { onDelete: 'set null' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull(),
    reason: text('reason'),
    status: text('status').default('pending').notNull(),
    requestedByUserId: uuid('requested_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    providerRefundId: text('provider_refund_id'),
    processedAt: timestamp('processed_at'),
  },
  (table) => ({
    creatorIdIdx: index('refunds_creator_id_idx').on(table.creatorId),
  })
);

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    ...commonColumns,
    sourceDomain: text('source_domain').notNull(),
    eventType: text('event_type').notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    creatorId: uuid('creator_id').references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    targetType: text('target_type'),
    targetId: uuid('target_id'),
    occurredAt: timestamp('occurred_at').notNull(),
    metadata: jsonb('metadata'),
    idempotencyKey: text('idempotency_key').notNull(),
    ingestedAt: timestamp('ingested_at').defaultNow().notNull(),
  },
  (table) => ({
    idempotencyKeyUniqueIdx: uniqueIndex('analytics_events_idempotency_key_uidx').on(
      table.idempotencyKey
    ),
    creatorOccurredIdx: index('analytics_events_creator_occurred_idx').on(
      table.creatorId,
      table.occurredAt
    ),
    sourceEventIdx: index('analytics_events_source_event_idx').on(
      table.sourceDomain,
      table.eventType
    ),
  })
);

export const creatorDailyMetrics = pgTable(
  'creator_daily_metrics',
  {
    ...commonColumns,
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    timezone: text('timezone').default('UTC').notNull(),
    followersDelta: integer('followers_delta').default(0).notNull(),
    freeMembersDelta: integer('free_members_delta').default(0).notNull(),
    paidMembersDelta: integer('paid_members_delta').default(0).notNull(),
    cancellations: integer('cancellations').default(0).notNull(),
    activeSupporters: integer('active_supporters').default(0).notNull(),
    postViews: integer('post_views').default(0).notNull(),
    comments: integer('comments').default(0).notNull(),
    translationSubmissions: integer('translation_submissions').default(0).notNull(),
    streamAttendance: integer('stream_attendance').default(0).notNull(),
  },
  (table) => ({
    creatorDateUniqueIdx: uniqueIndex('creator_daily_metrics_creator_date_uidx').on(
      table.creatorId,
      table.date,
      table.timezone
    ),
  })
);

export const creatorMembershipDailySummaries = pgTable(
  'creator_membership_daily_summaries',
  {
    ...commonColumns,
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    timezone: text('timezone').default('UTC').notNull(),
    summary: text('summary').notNull(),
    metrics: jsonb('metrics').notNull(),
    notableEvents: jsonb('notable_events').notNull(),
    notificationStatus: text('notification_status').default('pending').notNull(),
  },
  (table) => ({
    creatorDateUniqueIdx: uniqueIndex('membership_daily_summaries_creator_date_uidx').on(
      table.creatorId,
      table.date,
      table.timezone
    ),
  })
);

export const fanActivityDailyMetrics = pgTable(
  'fan_activity_daily_metrics',
  {
    ...commonColumns,
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    fanUserId: uuid('fan_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    activityScore: integer('activity_score').default(0).notNull(),
    eventCounts: jsonb('event_counts').notNull(),
    lastActivityAt: timestamp('last_activity_at'),
  },
  (table) => ({
    creatorFanDateUniqueIdx: uniqueIndex('fan_activity_creator_fan_date_uidx').on(
      table.creatorId,
      table.fanUserId,
      table.date
    ),
  })
);

export const achievementDefinitions = pgTable(
  'achievement_definitions',
  {
    ...commonColumns,
    key: text('key').notNull(),
    scope: text('scope').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    conditionType: text('condition_type').notNull(),
    conditionConfig: jsonb('condition_config').notNull(),
    repeatability: text('repeatability').default('once').notNull(),
    visibility: text('visibility').default('public').notNull(),
    enabled: boolean('enabled').default(true).notNull(),
  },
  (table) => ({
    keyUniqueIdx: uniqueIndex('achievement_definitions_key_uidx').on(table.key),
    enabledIdx: index('achievement_definitions_enabled_idx').on(table.enabled),
  })
);

export const achievementUnlocks = pgTable(
  'achievement_unlocks',
  {
    ...commonColumns,
    achievementId: uuid('achievement_id')
      .notNull()
      .references(() => achievementDefinitions.id, { onDelete: 'cascade' }),
    scope: text('scope').notNull(),
    creatorId: uuid('creator_id').references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    unlockedAt: timestamp('unlocked_at').defaultNow().notNull(),
    sourceEventId: uuid('source_event_id').references(() => analyticsEvents.id, {
      onDelete: 'set null',
    }),
    notificationStatus: text('notification_status').default('pending').notNull(),
  },
  (table) => ({
    achievementScopeUniqueIdx: uniqueIndex('achievement_unlocks_scope_uidx').on(
      table.achievementId,
      table.scope,
      table.creatorId,
      table.userId
    ),
  })
);

export const analyticsAlertCandidates = pgTable(
  'analytics_alert_candidates',
  {
    ...commonColumns,
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    alertType: text('alert_type').notNull(),
    priority: text('priority').default('normal').notNull(),
    payload: jsonb('payload').notNull(),
    status: text('status').default('pending').notNull(),
    processedAt: timestamp('processed_at'),
  },
  (table) => ({
    creatorStatusIdx: index('analytics_alerts_creator_status_idx').on(
      table.creatorId,
      table.status
    ),
  })
);

export const analyticsJobs = pgTable(
  'analytics_jobs',
  {
    ...commonColumns,
    jobType: text('job_type').notNull(),
    targetDate: text('target_date').notNull(),
    status: text('status').default('queued').notNull(),
    startedAt: timestamp('started_at'),
    finishedAt: timestamp('finished_at'),
    error: text('error'),
  },
  (table) => ({
    jobTargetUniqueIdx: uniqueIndex('analytics_jobs_type_target_uidx').on(
      table.jobType,
      table.targetDate
    ),
  })
);

export const notificationRequests = pgTable(
  'notification_requests',
  {
    ...commonColumns,
    recipientUserId: uuid('recipient_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    audienceType: text('audience_type').default('user').notNull(),
    notificationType: text('notification_type').notNull(),
    priority: text('priority').default('normal').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    payload: jsonb('payload'),
    sourceDomain: text('source_domain').notNull(),
    sourceEventId: text('source_event_id').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    status: text('status').default('queued').notNull(),
    error: text('error'),
  },
  (table) => ({
    idempotencyUniqueIdx: uniqueIndex('notification_requests_idempotency_uidx').on(
      table.idempotencyKey
    ),
    recipientIdx: index('notification_requests_recipient_idx').on(table.recipientUserId),
    sourceIdx: index('notification_requests_source_idx').on(
      table.sourceDomain,
      table.sourceEventId
    ),
  })
);

export const notifications = pgTable(
  'notifications',
  {
    ...commonColumns,
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    requestId: uuid('request_id').references(() => notificationRequests.id, {
      onDelete: 'set null',
    }),
    notificationType: text('notification_type').notNull(),
    priority: text('priority').default('normal').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    payload: jsonb('payload'),
    sourceDomain: text('source_domain').notNull(),
    sourceEventId: text('source_event_id').notNull(),
    readAt: timestamp('read_at'),
    archivedAt: timestamp('archived_at'),
  },
  (table) => ({
    userCreatedIdx: index('notifications_user_created_idx').on(table.userId, table.createdAt),
    unreadIdx: index('notifications_user_read_idx').on(table.userId, table.readAt),
    sourceUniqueIdx: uniqueIndex('notifications_source_user_uidx').on(
      table.userId,
      table.sourceDomain,
      table.sourceEventId,
      table.notificationType
    ),
  })
);

export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    ...commonColumns,
    notificationId: uuid('notification_id').references(() => notifications.id, {
      onDelete: 'cascade',
    }),
    requestId: uuid('request_id').references(() => notificationRequests.id, {
      onDelete: 'cascade',
    }),
    channel: text('channel').notNull(),
    status: text('status').default('queued').notNull(),
    provider: text('provider'),
    providerMessageId: text('provider_message_id'),
    attemptedAt: timestamp('attempted_at'),
    deliveredAt: timestamp('delivered_at'),
    error: text('error'),
  },
  (table) => ({
    notificationIdx: index('notification_deliveries_notification_idx').on(table.notificationId),
    requestIdx: index('notification_deliveries_request_idx').on(table.requestId),
  })
);

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    ...commonColumns,
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    notificationType: text('notification_type').notNull(),
    channel: text('channel').notNull(),
    deliveryMode: text('delivery_mode').default('immediate').notNull(),
    enabled: boolean('enabled').default(true).notNull(),
  },
  (table) => ({
    preferenceUniqueIdx: uniqueIndex('notification_preferences_uidx').on(
      table.userId,
      table.notificationType,
      table.channel
    ),
  })
);

export const notificationDigestPreferences = pgTable(
  'notification_digest_preferences',
  {
    ...commonColumns,
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    digestKey: text('digest_key').notNull(),
    timezone: text('timezone').default('Asia/Tokyo').notNull(),
    sendHour: integer('send_hour').default(9).notNull(),
    enabled: boolean('enabled').default(true).notNull(),
  },
  (table) => ({
    digestUniqueIdx: uniqueIndex('notification_digest_preferences_uidx').on(
      table.userId,
      table.digestKey
    ),
  })
);

export const notificationTemplates = pgTable(
  'notification_templates',
  {
    ...commonColumns,
    notificationType: text('notification_type').notNull(),
    channel: text('channel').notNull(),
    locale: text('locale').default('ja').notNull(),
    titleTemplate: text('title_template').notNull(),
    bodyTemplate: text('body_template'),
    enabled: boolean('enabled').default(true).notNull(),
  },
  (table) => ({
    templateUniqueIdx: uniqueIndex('notification_templates_uidx').on(
      table.notificationType,
      table.channel,
      table.locale
    ),
  })
);

export const notificationDevices = pgTable(
  'notification_devices',
  {
    ...commonColumns,
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(),
    tokenCiphertext: text('token_ciphertext').notNull(),
    deviceName: text('device_name'),
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
    revokedAt: timestamp('revoked_at'),
  },
  (table) => ({
    userIdx: index('notification_devices_user_idx').on(table.userId),
    activeIdx: index('notification_devices_active_idx').on(table.userId, table.revokedAt),
  })
);

export const posts = pgTable(
  'posts',
  {
    ...commonColumns,
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    postType: text('post_type').notNull(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    summary: text('summary'),
    status: text('status').default('draft').notNull(),
    accessType: text('access_type').default('public').notNull(),
    ageRating: text('age_rating').default('all_ages').notNull(),
    isAiGenerated: boolean('is_ai_generated').default(false).notNull(),
    language: text('language').default('ja').notNull(),
    thumbnailMediaId: uuid('thumbnail_media_id'),
    publishedAt: timestamp('published_at'),
    scheduledAt: timestamp('scheduled_at'),
    backdatedAt: timestamp('backdated_at'),
    editedAt: timestamp('edited_at'),
    version: integer('version').default(1).notNull(),
  },
  (table) => ({
    creatorIdIdx: index('posts_creator_id_idx').on(table.creatorId),
    statusIdx: index('posts_status_idx').on(table.status),
    slugUniqueIdx: uniqueIndex('posts_creator_slug_uidx').on(table.creatorId, table.slug),
  })
);

export const postAccessRules = pgTable(
  'post_access_rules',
  {
    ...commonColumns,
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    ruleType: text('rule_type').notNull(),
    tierId: uuid('tier_id').references(() => membershipTiers.id, { onDelete: 'restrict' }),
    priceId: uuid('price_id'),
    startsAt: timestamp('starts_at'),
    endsAt: timestamp('ends_at'),
  },
  (table) => ({
    postIdIdx: index('post_access_rules_post_id_idx').on(table.postId),
  })
);

export const postBlocks = pgTable(
  'post_blocks',
  {
    ...commonColumns,
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    visibility: text('visibility').default('full').notNull(),
    data: jsonb('data').notNull(),
  },
  (table) => ({
    postIdIdx: index('post_blocks_post_id_idx').on(table.postId),
  })
);

export const postTags = pgTable(
  'post_tags',
  {
    ...commonColumns,
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    normalizedName: text('normalized_name').notNull(),
    displayName: text('display_name').notNull(),
    locale: text('locale'),
  },
  (table) => ({
    postTagUniqueIdx: uniqueIndex('post_tags_post_name_uidx').on(
      table.postId,
      table.normalizedName
    ),
  })
);

export const series = pgTable(
  'series',
  {
    ...commonColumns,
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    postType: text('post_type'),
    visibility: text('visibility').default('public').notNull(),
    coverMediaId: uuid('cover_media_id'),
  },
  (table) => ({
    creatorIdIdx: index('series_creator_id_idx').on(table.creatorId),
  })
);

export const seriesEntries = pgTable(
  'series_entries',
  {
    ...commonColumns,
    seriesId: uuid('series_id')
      .notNull()
      .references(() => series.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    chapterNumber: integer('chapter_number'),
    volumeNumber: integer('volume_number'),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => ({
    seriesPostUniqueIdx: uniqueIndex('series_entries_series_post_uidx').on(
      table.seriesId,
      table.postId
    ),
  })
);

export const postComments = pgTable(
  'post_comments',
  {
    ...commonColumns,
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): AnyPgColumn => postComments.id, {
      onDelete: 'cascade',
    }),
    body: text('body').notNull(),
    status: text('status').default('visible').notNull(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    postIdIdx: index('post_comments_post_id_idx').on(table.postId),
    authorIdIdx: index('post_comments_author_id_idx').on(table.authorId),
  })
);

export const projects = pgTable(
  'projects',
  {
    ...commonColumns,
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    summary: text('summary'),
    description: text('description'),
    status: text('status').default('draft').notNull(),
    visibility: text('visibility').default('private').notNull(),
    coverMediaId: uuid('cover_media_id').references(() => mediaAssets.id, { onDelete: 'set null' }),
    startedAt: timestamp('started_at'),
    targetDate: timestamp('target_date'),
    completedAt: timestamp('completed_at'),
  },
  (table) => ({
    creatorSlugUniqueIdx: uniqueIndex('projects_creator_slug_uidx').on(table.creatorId, table.slug),
    creatorStatusIdx: index('projects_creator_status_idx').on(table.creatorId, table.status),
  })
);

export const projectMilestones = pgTable(
  'project_milestones',
  {
    ...commonColumns,
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    dueDate: timestamp('due_date'),
    status: text('status').default('planned').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    completedAt: timestamp('completed_at'),
  },
  (table) => ({
    projectIdIdx: index('project_milestones_project_id_idx').on(table.projectId),
  })
);

export const projectTasks = pgTable(
  'project_tasks',
  {
    ...commonColumns,
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    milestoneId: uuid('milestone_id').references(() => projectMilestones.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').default('todo').notNull(),
    assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
    dueDate: timestamp('due_date'),
    sortOrder: integer('sort_order').default(0).notNull(),
    completedAt: timestamp('completed_at'),
  },
  (table) => ({
    projectStatusIdx: index('project_tasks_project_status_idx').on(table.projectId, table.status),
  })
);

export const projectUpdates = pgTable(
  'project_updates',
  {
    ...commonColumns,
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    body: text('body').notNull(),
    visibility: text('visibility').default('private').notNull(),
    tierIds: jsonb('tier_ids').notNull(),
    publishedAt: timestamp('published_at'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    projectPublishedIdx: index('project_updates_project_published_idx').on(
      table.projectId,
      table.publishedAt
    ),
  })
);

export const projectRelatedPosts = pgTable(
  'project_related_posts',
  {
    ...commonColumns,
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    relationType: text('relation_type').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => ({
    projectPostUniqueIdx: uniqueIndex('project_related_posts_project_post_uidx').on(
      table.projectId,
      table.postId
    ),
  })
);

export const projectRelatedMedia = pgTable(
  'project_related_media',
  {
    ...commonColumns,
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    relationType: text('relation_type').notNull(),
    visibility: text('visibility').default('private').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => ({
    projectMediaUniqueIdx: uniqueIndex('project_related_media_project_media_uidx').on(
      table.projectId,
      table.mediaId
    ),
  })
);

export const projectCollaborators = pgTable(
  'project_collaborators',
  {
    ...commonColumns,
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').default('viewer').notNull(),
  },
  (table) => ({
    projectUserUniqueIdx: uniqueIndex('project_collaborators_project_user_uidx').on(
      table.projectId,
      table.userId
    ),
  })
);

export const streams = pgTable(
  'streams',
  {
    ...commonColumns,
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').default('draft').notNull(),
    visibility: text('visibility').default('public').notNull(),
    scheduledAt: timestamp('scheduled_at'),
    startedAt: timestamp('started_at'),
    endedAt: timestamp('ended_at'),
    embedUrl: text('embed_url'),
    embedProvider: text('embed_provider'),
    posterMediaId: uuid('poster_media_id').references(() => mediaAssets.id, {
      onDelete: 'set null',
    }),
    archivePostId: uuid('archive_post_id').references(() => posts.id, { onDelete: 'set null' }),
  },
  (table) => ({
    creatorStatusIdx: index('streams_creator_status_idx').on(table.creatorId, table.status),
  })
);

export const streamChatMessages = pgTable(
  'stream_chat_messages',
  {
    ...commonColumns,
    streamId: uuid('stream_id')
      .notNull()
      .references(() => streams.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    message: text('message').notNull(),
    status: text('status').default('visible').notNull(),
    safetyDecision: text('safety_decision'),
    hiddenAt: timestamp('hidden_at'),
  },
  (table) => ({
    streamCreatedIdx: index('stream_chat_messages_stream_created_idx').on(
      table.streamId,
      table.createdAt
    ),
  })
);

export const streamChatModerationActions = pgTable(
  'stream_chat_moderation_actions',
  {
    ...commonColumns,
    streamId: uuid('stream_id')
      .notNull()
      .references(() => streams.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id')
      .notNull()
      .references(() => streamChatMessages.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    reason: text('reason'),
  },
  (table) => ({
    streamIdx: index('stream_chat_moderation_actions_stream_idx').on(table.streamId),
  })
);

export const streamTipGoals = pgTable(
  'stream_tip_goals',
  {
    ...commonColumns,
    streamId: uuid('stream_id')
      .notNull()
      .references(() => streams.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    targetAmount: integer('target_amount').notNull(),
    currentAmount: integer('current_amount').default(0).notNull(),
    currency: text('currency').notNull(),
    status: text('status').default('draft').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => ({
    streamSortIdx: index('stream_tip_goals_stream_sort_idx').on(table.streamId, table.sortOrder),
  })
);

export const streamEvents = pgTable(
  'stream_events',
  {
    ...commonColumns,
    streamId: uuid('stream_id')
      .notNull()
      .references(() => streams.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload'),
    occurredAt: timestamp('occurred_at').defaultNow().notNull(),
  },
  (table) => ({
    streamOccurredIdx: index('stream_events_stream_occurred_idx').on(
      table.streamId,
      table.occurredAt
    ),
  })
);

export const streamArchiveRequests = pgTable(
  'stream_archive_requests',
  {
    ...commonColumns,
    streamId: uuid('stream_id')
      .notNull()
      .references(() => streams.id, { onDelete: 'cascade' }),
    requestedByUserId: uuid('requested_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').default('queued').notNull(),
    archiveMediaId: uuid('archive_media_id').references(() => mediaAssets.id, {
      onDelete: 'set null',
    }),
    archivePostId: uuid('archive_post_id').references(() => posts.id, { onDelete: 'set null' }),
    error: text('error'),
    completedAt: timestamp('completed_at'),
  },
  (table) => ({
    streamStatusIdx: index('stream_archive_requests_stream_status_idx').on(
      table.streamId,
      table.status
    ),
  })
);

export const fanTranslationTracks = pgTable(
  'fan_translation_tracks',
  {
    ...commonColumns,
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    contributionType: text('contribution_type').notNull(),
    sourceLanguage: text('source_language').notNull(),
    targetLanguage: text('target_language').notNull(),
    locale: text('locale'),
    title: text('title').notNull(),
    status: text('status').default('draft').notNull(),
    approvalState: text('approval_state').default('unreviewed').notNull(),
    visibility: text('visibility').default('public').notNull(),
  },
  (table) => ({
    postStatusIdx: index('fan_translation_tracks_post_status_idx').on(table.postId, table.status),
  })
);

export const subtitleCues = pgTable(
  'subtitle_cues',
  {
    ...commonColumns,
    trackId: uuid('track_id')
      .notNull()
      .references(() => fanTranslationTracks.id, { onDelete: 'cascade' }),
    startMs: integer('start_ms').notNull(),
    endMs: integer('end_ms').notNull(),
    text: text('text').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => ({
    trackSortIdx: index('subtitle_cues_track_sort_idx').on(table.trackId, table.sortOrder),
  })
);

export const translationAnnotations = pgTable(
  'translation_annotations',
  {
    ...commonColumns,
    trackId: uuid('track_id')
      .notNull()
      .references(() => fanTranslationTracks.id, { onDelete: 'cascade' }),
    anchorType: text('anchor_type').notNull(),
    anchorData: jsonb('anchor_data').notNull(),
    originalText: text('original_text'),
    translatedText: text('translated_text').notNull(),
    note: text('note'),
    status: text('status').default('active').notNull(),
  },
  (table) => ({
    trackIdx: index('translation_annotations_track_idx').on(table.trackId),
  })
);

export const translationVotes = pgTable(
  'translation_votes',
  {
    ...commonColumns,
    trackId: uuid('track_id')
      .notNull()
      .references(() => fanTranslationTracks.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    value: text('value').notNull(),
    reason: text('reason'),
  },
  (table) => ({
    uniqueVoteIdx: uniqueIndex('translation_votes_track_user_uidx').on(table.trackId, table.userId),
  })
);

export const translationReports = pgTable(
  'translation_reports',
  {
    ...commonColumns,
    trackId: uuid('track_id')
      .notNull()
      .references(() => fanTranslationTracks.id, { onDelete: 'cascade' }),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    status: text('status').default('open').notNull(),
  },
  (table) => ({
    trackStatusIdx: index('translation_reports_track_status_idx').on(table.trackId, table.status),
  })
);

export const creatorTranslationApprovals = pgTable(
  'creator_translation_approvals',
  {
    ...commonColumns,
    trackId: uuid('track_id')
      .notNull()
      .references(() => fanTranslationTracks.id, { onDelete: 'cascade' }),
    creatorId: uuid('creator_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    approvalState: text('approval_state').notNull(),
    note: text('note'),
    decidedAt: timestamp('decided_at').defaultNow().notNull(),
  },
  (table) => ({
    trackCreatorUniqueIdx: uniqueIndex('creator_translation_approvals_track_creator_uidx').on(
      table.trackId,
      table.creatorId
    ),
  })
);

export const aiTranslationDrafts = pgTable(
  'ai_translation_drafts',
  {
    ...commonColumns,
    targetType: text('target_type').notNull(),
    targetId: uuid('target_id'),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    creatorId: uuid('creator_id').references(() => creatorProfiles.id, { onDelete: 'set null' }),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    sourceLanguage: text('source_language').notNull(),
    targetLanguage: text('target_language').notNull(),
    promptVersion: text('prompt_version').notNull(),
    status: text('status').default('generated').notNull(),
    safetyDecision: text('safety_decision'),
  },
  (table) => ({
    targetIdx: index('ai_translation_drafts_target_idx').on(table.targetType, table.targetId),
    userIdx: index('ai_translation_drafts_user_idx').on(table.userId),
  })
);

export const aiTranslationSegments = pgTable(
  'ai_translation_segments',
  {
    ...commonColumns,
    draftId: uuid('draft_id')
      .notNull()
      .references(() => aiTranslationDrafts.id, { onDelete: 'cascade' }),
    sourceTextHash: text('source_text_hash').notNull(),
    sourceTextPreview: text('source_text_preview').notNull(),
    translatedText: text('translated_text').notNull(),
    startMs: integer('start_ms'),
    endMs: integer('end_ms'),
    anchorData: jsonb('anchor_data'),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => ({
    draftSortIdx: index('ai_translation_segments_draft_sort_idx').on(
      table.draftId,
      table.sortOrder
    ),
  })
);

export const aiTranslationCache = pgTable(
  'ai_translation_cache',
  {
    ...commonColumns,
    targetType: text('target_type').notNull(),
    targetId: uuid('target_id'),
    sourceHash: text('source_hash').notNull(),
    sourceLanguage: text('source_language').notNull(),
    targetLanguage: text('target_language').notNull(),
    translatedText: text('translated_text').notNull(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    safetyDecision: text('safety_decision'),
    expiresAt: timestamp('expires_at'),
  },
  (table) => ({
    sourceUniqueIdx: uniqueIndex('ai_translation_cache_source_uidx').on(
      table.targetType,
      table.targetId,
      table.sourceHash,
      table.targetLanguage
    ),
  })
);

export const aiGlossaryTerms = pgTable(
  'ai_glossary_terms',
  {
    ...commonColumns,
    creatorId: uuid('creator_id').references(() => creatorProfiles.id, { onDelete: 'set null' }),
    postId: uuid('post_id').references(() => posts.id, { onDelete: 'set null' }),
    seriesId: uuid('series_id').references(() => series.id, { onDelete: 'set null' }),
    sourceText: text('source_text').notNull(),
    targetText: text('target_text').notNull(),
    sourceLanguage: text('source_language').notNull(),
    targetLanguage: text('target_language').notNull(),
    note: text('note'),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    creatorLangIdx: index('ai_glossary_terms_creator_lang_idx').on(
      table.creatorId,
      table.sourceLanguage,
      table.targetLanguage
    ),
  })
);

export const aiAssistUsage = pgTable(
  'ai_assist_usage',
  {
    ...commonColumns,
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    creatorId: uuid('creator_id').references(() => creatorProfiles.id, { onDelete: 'set null' }),
    postId: uuid('post_id').references(() => posts.id, { onDelete: 'set null' }),
    targetType: text('target_type').notNull(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    inputTokens: integer('input_tokens').default(0).notNull(),
    outputTokens: integer('output_tokens').default(0).notNull(),
    estimatedCost: integer('estimated_cost').default(0).notNull(),
    generatedAt: timestamp('generated_at').defaultNow().notNull(),
  },
  (table) => ({
    userGeneratedIdx: index('ai_assist_usage_user_generated_idx').on(
      table.userId,
      table.generatedAt
    ),
  })
);

export const aiProviderConfigs = pgTable(
  'ai_provider_configs',
  {
    ...commonColumns,
    provider: text('provider').notNull().unique(),
    enabled: boolean('enabled').default(true).notNull(),
    allowedLanguages: jsonb('allowed_languages').notNull(),
    monthlyTokenLimit: integer('monthly_token_limit').default(1_000_000).notNull(),
    externalSendPolicy: text('external_send_policy').default('allow_public_only').notNull(),
    dataRetentionLabel: text('data_retention_label').default('30_days').notNull(),
  },
  (table) => ({
    enabledIdx: index('ai_provider_configs_enabled_idx').on(table.enabled),
  })
);
