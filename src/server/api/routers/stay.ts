import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const stayRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ lodgeId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const businessLodgeIds = await ctx.db.lodge.findMany({
        where: { businessId: ctx.session.user.businessId || undefined },
        select: { id: true },
      });
      const lodgeIds = businessLodgeIds.map((l) => l.id);

      return ctx.db.stay.findMany({
        where: {
          lodgeId: input?.lodgeId ? { in: [input.lodgeId] } : { in: lodgeIds },
        },
        include: { lodge: { select: { id: true, name: true } } },
        orderBy: { startDate: "desc" },
      });
    }),

  active: protectedProcedure
    .input(z.object({ lodgeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 86_400_000);

      return ctx.db.stay.findMany({
        where: {
          lodgeId: input.lodgeId,
          startDate: { lte: endOfDay },
          endDate: { gte: startOfDay },
        },
        orderBy: { startDate: "desc" },
      });
    }),

  create: adminProcedure
    .input(
      z.object({
        lodgeId: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        label: z.string().optional(),
        driverName: z.string().optional(),
        trackerName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);
      if (end < start) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "End date must be after start date" });
      }
      return ctx.db.stay.create({
        data: {
          lodgeId: input.lodgeId,
          startDate: start,
          endDate: end,
          label: input.label ?? null,
          driverName: input.driverName ?? null,
          trackerName: input.trackerName ?? null,
        },
      });
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        label: z.string().nullable().optional(),
        driverName: z.string().nullable().optional(),
        trackerName: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;
      const data: Record<string, unknown> = {};
      if (fields.startDate !== undefined) data.startDate = new Date(fields.startDate);
      if (fields.endDate !== undefined) data.endDate = new Date(fields.endDate);
      if (fields.label !== undefined) data.label = fields.label;
      if (fields.driverName !== undefined) data.driverName = fields.driverName;
      if (fields.trackerName !== undefined) data.trackerName = fields.trackerName;
      return ctx.db.stay.update({ where: { id }, data });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.stay.delete({ where: { id: input.id } });
    }),
});
