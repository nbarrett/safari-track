import type { Prisma } from "../../../../generated/prisma";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

const gpsPointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  timestamp: z.string(),
});

export const driveRouter = createTRPCRouter({
  start: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.db.driveSession.create({
      data: {
        userId: ctx.session.user.id,
        lodgeId: ctx.session.user.lodgeId,
        route: [],
      },
    });
  }),

  end: protectedProcedure
    .input(z.object({ id: z.string(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.driveSession.update({
        where: { id: input.id },
        data: {
          endedAt: new Date(),
          notes: input.notes,
        },
      });
    }),

  discard: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.sighting.deleteMany({
        where: { driveSessionId: input.id },
      });
      return ctx.db.driveSession.delete({
        where: { id: input.id },
      });
    }),

  deleteMany: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const drives = await ctx.db.driveSession.findMany({
        where: { id: { in: input.ids }, userId: ctx.session.user.id },
        select: { id: true },
      });
      const ownedIds = drives.map((d) => d.id);
      if (ownedIds.length === 0) return { deleted: 0 };
      await ctx.db.sighting.deleteMany({
        where: { driveSessionId: { in: ownedIds } },
      });
      const result = await ctx.db.driveSession.deleteMany({
        where: { id: { in: ownedIds } },
      });
      return { deleted: result.count };
    }),

  addRoutePoints: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        points: z.array(gpsPointSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.driveSession.findUnique({
        where: { id: input.id },
      });

      if (!session) {
        throw new Error("Drive session not found");
      }

      const existingRoute = (session.route ?? []).filter(
        (p): p is Prisma.JsonObject => p !== null && typeof p === "object" && !Array.isArray(p),
      );

      const newPoints = input.points.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        timestamp: p.timestamp,
      }));

      return ctx.db.driveSession.update({
        where: { id: input.id },
        data: {
          route: [...existingRoute, ...newPoints],
        },
      });
    }),

  active: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.driveSession.findFirst({
      where: {
        userId: ctx.session.user.id,
        endedAt: null,
      },
      include: { sightings: { include: { species: true } } },
    });
  }),

  detail: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.driveSession.findUnique({
        where: { id: input.id },
        include: {
          sightings: { include: { species: true } },
          user: { select: { name: true } },
        },
      });
    }),

  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(20),
          cursor: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const cursor = input?.cursor;

      const items = await ctx.db.driveSession.findMany({
        where: { lodgeId: ctx.session.user.lodgeId },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { startedAt: "desc" },
        include: {
          user: { select: { id: true, name: true } },
          _count: { select: { sightings: true } },
        },
      });

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return { items, nextCursor };
    }),
});
