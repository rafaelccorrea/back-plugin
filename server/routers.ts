import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { leadsRouter } from "./routers/leads";
import { billingRouter } from "./routers/billing";
import { checkoutRouter } from "./routers/checkout";
import { notificationsRouter } from "./routers/notifications";
import { authRouter } from "./routers/auth";
import { sentimentRouter } from "./routers/sentiment";
import { escalationRouter } from "./routers/escalation";
import { adminRouter } from "./routers/admin";
import { analyticsRouter } from "./routers/analytics";
import { aiRouter } from "./routers/ai";
import { stripeSyncRouter } from "./routers/stripe-sync";
import { adminBillingRouter } from "./routers/admin-billing";
import { supportRouter } from "./routers/support";
import { appointmentsRouter } from "./routers/appointments";
import { webhooksRouter } from "./routers/webhooks";
import { integrationsRouter } from "./routers/integrations";
import { automationsRouter } from "./routers/automations";
import { openClawAutomationsRouter } from "./routers/openclaw-automations";
import { aiAssistantRouter } from "./routers/ai-assistant";
import { preAttendanceRouter } from "./routers/preAttendance";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    ...authRouter._def.procedures,
  }),

  leads: leadsRouter,
  billing: billingRouter,
  checkout: checkoutRouter,
  notifications: notificationsRouter,
  sentiment: sentimentRouter,
  escalation: escalationRouter,
  admin: adminRouter,
  adminBilling: adminBillingRouter,
  support: supportRouter,
  analytics: analyticsRouter,
  ai: aiRouter,
  stripeSync: stripeSyncRouter,
  appointments: appointmentsRouter,
  webhooks: webhooksRouter,
  integrations: integrationsRouter,
  automations: automationsRouter,
  openClawAutomations: openClawAutomationsRouter,
  aiAssistant: aiAssistantRouter,
  preAttendance: preAttendanceRouter,
});

export type AppRouter = typeof appRouter;
