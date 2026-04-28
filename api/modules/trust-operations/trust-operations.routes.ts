import { createRoute, z } from '@hono/zod-openapi';
import {
  createTrustCaseSchema,
  createTrustInternalNoteSchema,
  createTrustReportSchema,
  createTrustStaffActionSchema,
  publishTrustDecisionSchema,
  resolveTrustAppealSchema,
  systemAuditEventsResponseSchema,
  trustAppealsResponseSchema,
  trustCaseDetailResponseSchema,
  trustCasesResponseSchema,
  trustReportsResponseSchema,
  updateTrustCaseSchema,
} from '../../../shared/schemas/trust-operations.schema';
import { AuthError, ForbiddenError } from '../../lib/errors';
import { createOpenApiRouter } from '../../lib/openapi';
import { authMiddleware } from '../../middleware/auth';
import { trustOperationsService } from './trust-operations.service';

const idParamSchema = z.object({ id: z.string().uuid() });
const requireUser = (
  user:
    | {
        userId: string;
        capabilities?: {
          canAccessTrustOperations?: boolean;
          canManageContentSafety?: boolean;
          canManagePayments?: boolean;
        };
      }
    | undefined
) => {
  if (!user) throw new AuthError();
  return user;
};
const requireStaff = (user: Parameters<typeof requireUser>[0]) => {
  const currentUser = requireUser(user);
  const capabilities = currentUser.capabilities;
  if (
    !(
      capabilities?.canAccessTrustOperations ||
      capabilities?.canManageContentSafety ||
      capabilities?.canManagePayments
    )
  ) {
    throw new ForbiddenError('Trust operations permission is required');
  }
  return currentUser;
};

const createReportRoute = createRoute({
  method: 'post',
  path: '/',
  request: { body: { content: { 'application/json': { schema: createTrustReportSchema } } } },
  responses: { 201: { description: 'Report created' } },
});

const listReportsRoute = createRoute({
  method: 'get',
  path: '/reports',
  request: { query: z.object({ status: z.string().optional() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: trustReportsResponseSchema } },
      description: 'Trust reports',
    },
  },
});

const listCasesRoute = createRoute({
  method: 'get',
  path: '/cases',
  request: { query: z.object({ status: z.string().optional() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: trustCasesResponseSchema } },
      description: 'Trust cases',
    },
  },
});

const createCaseRoute = createRoute({
  method: 'post',
  path: '/cases',
  request: { body: { content: { 'application/json': { schema: createTrustCaseSchema } } } },
  responses: { 201: { description: 'Trust case created' } },
});

const getCaseRoute = createRoute({
  method: 'get',
  path: '/cases/:id',
  request: { params: idParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: trustCaseDetailResponseSchema } },
      description: 'Trust case detail',
    },
  },
});

const updateCaseRoute = createRoute({
  method: 'patch',
  path: '/cases/:id',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: updateTrustCaseSchema } } },
  },
  responses: { 200: { description: 'Trust case updated' } },
});

const staffActionRoute = createRoute({
  method: 'post',
  path: '/cases/:id/actions',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: createTrustStaffActionSchema } } },
  },
  responses: { 201: { description: 'Staff action recorded' } },
});

const internalNoteRoute = createRoute({
  method: 'post',
  path: '/cases/:id/notes',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: createTrustInternalNoteSchema } } },
  },
  responses: { 201: { description: 'Internal note created' } },
});

const decisionRoute = createRoute({
  method: 'post',
  path: '/cases/:id/decisions',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: publishTrustDecisionSchema } } },
  },
  responses: { 201: { description: 'Decision published' } },
});

const listAppealsRoute = createRoute({
  method: 'get',
  path: '/appeals',
  request: { query: z.object({ status: z.string().optional() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: trustAppealsResponseSchema } },
      description: 'Trust appeals',
    },
  },
});

const resolveAppealRoute = createRoute({
  method: 'post',
  path: '/appeals/:id/resolve',
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: resolveTrustAppealSchema } } },
  },
  responses: { 200: { description: 'Trust appeal resolved' } },
});

const auditLogsRoute = createRoute({
  method: 'get',
  path: '/audit-logs',
  request: {
    query: z.object({
      sourceDomain: z.string().optional(),
      actorId: z.string().uuid().optional(),
      targetType: z.string().optional(),
      targetId: z.string().uuid().optional(),
      limit: z.coerce.number().int().min(1).max(500).default(100),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: systemAuditEventsResponseSchema } },
      description: 'System audit events',
    },
  },
});

const protectedReports = createOpenApiRouter();
protectedReports.use('*', authMiddleware());
export const trustReportsRouter = protectedReports.openapi(createReportRoute, async (c) => {
  const user = requireUser(c.get('user'));
  const result = await trustOperationsService.createReport(c.req.valid('json'), user.userId);
  return c.json(result, 201);
});

const protectedAdmin = createOpenApiRouter();
protectedAdmin.use('*', authMiddleware());

export const trustOperationsAdminRouter = protectedAdmin
  .openapi(listReportsRoute, async (c) => {
    requireStaff(c.get('user'));
    const reports = await trustOperationsService.listReports(c.req.valid('query').status);
    return c.json(trustReportsResponseSchema.parse({ reports }), 200);
  })
  .openapi(listCasesRoute, async (c) => {
    requireStaff(c.get('user'));
    const cases = await trustOperationsService.listCases(c.req.valid('query').status);
    return c.json(trustCasesResponseSchema.parse({ cases }), 200);
  })
  .openapi(createCaseRoute, async (c) => {
    const user = requireStaff(c.get('user'));
    return c.json(await trustOperationsService.createCase(c.req.valid('json'), user.userId), 201);
  })
  .openapi(getCaseRoute, async (c) => {
    requireStaff(c.get('user'));
    const detail = await trustOperationsService.getCaseDetail(c.req.param('id'));
    return c.json(trustCaseDetailResponseSchema.parse(detail), 200);
  })
  .openapi(updateCaseRoute, async (c) => {
    const user = requireStaff(c.get('user'));
    return c.json(
      await trustOperationsService.updateCase(c.req.param('id'), c.req.valid('json'), user.userId),
      200
    );
  })
  .openapi(staffActionRoute, async (c) => {
    const user = requireStaff(c.get('user'));
    return c.json(
      await trustOperationsService.addStaffAction(
        c.req.param('id'),
        user.userId,
        c.req.valid('json')
      ),
      201
    );
  })
  .openapi(internalNoteRoute, async (c) => {
    const user = requireStaff(c.get('user'));
    return c.json(
      await trustOperationsService.addInternalNote(
        c.req.param('id'),
        user.userId,
        c.req.valid('json')
      ),
      201
    );
  })
  .openapi(decisionRoute, async (c) => {
    const user = requireStaff(c.get('user'));
    return c.json(
      await trustOperationsService.publishDecision(
        c.req.param('id'),
        user.userId,
        c.req.valid('json')
      ),
      201
    );
  })
  .openapi(listAppealsRoute, async (c) => {
    requireStaff(c.get('user'));
    const appeals = await trustOperationsService.listAppeals(c.req.valid('query').status);
    return c.json(trustAppealsResponseSchema.parse({ appeals }), 200);
  })
  .openapi(resolveAppealRoute, async (c) => {
    const user = requireStaff(c.get('user'));
    return c.json(
      await trustOperationsService.resolveAppeal(
        c.req.param('id'),
        user.userId,
        c.req.valid('json')
      ),
      200
    );
  })
  .openapi(auditLogsRoute, async (c) => {
    requireStaff(c.get('user'));
    const events = await trustOperationsService.listAuditEvents(c.req.valid('query'));
    return c.json(systemAuditEventsResponseSchema.parse({ events }), 200);
  });
