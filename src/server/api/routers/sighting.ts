import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const sightingRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        driveSessionId: z.string(),
        speciesId: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        count: z.number().int().min(1).default(1),
        notes: z.string().optional(),
        imageUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.sighting.create({
        data: {
          driveSessionId: input.driveSessionId,
          userId: ctx.session.user.id,
          speciesId: input.speciesId,
          latitude: input.latitude,
          longitude: input.longitude,
          count: input.count,
          notes: input.notes,
          imageUrl: input.imageUrl,
        },
        include: { species: true },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        speciesId: z.string().optional(),
        count: z.number().int().min(1).optional(),
        notes: z.string().optional(),
        imageUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.sighting.update({
        where: { id },
        data,
        include: { species: true },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.sighting.delete({ where: { id: input.id } });
    }),

  decrementBySpecies: protectedProcedure
    .input(
      z.object({
        driveSessionId: z.string(),
        speciesId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const latest = await ctx.db.sighting.findFirst({
        where: {
          driveSessionId: input.driveSessionId,
          speciesId: input.speciesId,
        },
        orderBy: { createdAt: "desc" },
      });
      if (!latest) return null;
      await ctx.db.sighting.delete({ where: { id: latest.id } });
      return latest;
    }),

  byDrive: protectedProcedure
    .input(z.object({ driveSessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.sighting.findMany({
        where: { driveSessionId: input.driveSessionId },
        include: { species: true, user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      });
    }),

  recent: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.sighting.findMany({
        where: {
          driveSession: { lodgeId: ctx.session.user.lodgeId },
        },
        take: input?.limit ?? 10,
        orderBy: { createdAt: "desc" },
        include: {
          species: true,
          user: { select: { name: true } },
          driveSession: { select: { id: true, startedAt: true } },
        },
      });
    }),
});
