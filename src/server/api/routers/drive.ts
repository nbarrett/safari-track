import type { Prisma } from "../../../../generated/prisma";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { haversineDistance } from "~/lib/drive-stats";

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
      const isAdmin = ctx.session.user.role === "ADMIN";
      const drives = await ctx.db.driveSession.findMany({
        where: isAdmin
          ? { id: { in: input.ids } }
          : { id: { in: input.ids }, userId: ctx.session.user.id },
        select: { id: true },
      });
      const allowedIds = drives.map((d) => d.id);
      if (allowedIds.length === 0) return { deleted: 0 };
      await ctx.db.sighting.deleteMany({
        where: { driveSessionId: { in: allowedIds } },
      });
      const result = await ctx.db.driveSession.deleteMany({
        where: { id: { in: allowedIds } },
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

  cleanRoutes: adminProcedure.mutation(async ({ ctx }) => {
    const MAX_SPEED_MS = 33;
    const NEAR_START_THRESHOLD_M = 200;

    const drives = await ctx.db.driveSession.findMany({
      where: { endedAt: { not: null } },
      select: { id: true, route: true },
    });

    let drivesFixed = 0;
    let pointsRemoved = 0;

    for (const drive of drives) {
      const route = (drive.route ?? []).filter(
        (p): p is { lat: number; lng: number; timestamp: string } =>
          p !== null &&
          typeof p === "object" &&
          !Array.isArray(p) &&
          "lat" in p &&
          "lng" in p &&
          "timestamp" in p,
      );

      if (route.length < 3) continue;

      const start = route[0]!;
      const segments: (typeof route)[] = [[route[0]!]];

      for (let i = 1; i < route.length; i++) {
        const prev = route[i - 1]!;
        const curr = route[i]!;
        const dist = haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
        const dt =
          (new Date(curr.timestamp).getTime() -
            new Date(prev.timestamp).getTime()) /
          1000;
        const speed = dt > 0 ? dist / dt : Infinity;

        if (speed > MAX_SPEED_MS) {
          segments.push([curr]);
        } else {
          segments[segments.length - 1]!.push(curr);
        }
      }

      const kept = segments.filter((segment, idx) => {
        if (idx === 0) return true;
        return !segment.every(
          (p) =>
            haversineDistance(start.lat, start.lng, p.lat, p.lng) <
            NEAR_START_THRESHOLD_M,
        );
      });

      const cleanedRoute = kept.flat();
      const removed = route.length - cleanedRoute.length;

      if (removed > 0) {
        await ctx.db.driveSession.update({
          where: { id: drive.id },
          data: { route: cleanedRoute },
        });
        drivesFixed++;
        pointsRemoved += removed;
      }
    }

    return { drivesFixed, pointsRemoved };
  }),
});
