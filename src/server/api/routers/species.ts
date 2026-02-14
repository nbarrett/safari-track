import { z } from "zod";

import { TRPCError } from "@trpc/server";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const speciesRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.species.findMany({
      orderBy: { commonName: "asc" },
    });
  }),

  byCategory: publicProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.species.findMany({
        where: { category: input.category },
        orderBy: { commonName: "asc" },
      });
    }),

  categories: publicProcedure.query(async ({ ctx }) => {
    const species = await ctx.db.species.findMany({
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    return species.map((s) => s.category);
  }),

  create: protectedProcedure
    .input(
      z.object({
        commonName: z.string().min(1),
        scientificName: z.string().optional(),
        category: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.species.create({ data: input });
    }),

  search: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.species.findMany({
        where: {
          commonName: { contains: input.query, mode: "insensitive" },
        },
        orderBy: { commonName: "asc" },
        take: 20,
      });
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        commonName: z.string().min(1).optional(),
        scientificName: z.string().optional(),
        category: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.species.update({ where: { id }, data });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sightingCount = await ctx.db.sighting.count({
        where: { speciesId: input.id },
      });
      if (sightingCount > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot delete: ${sightingCount} sighting(s) reference this species.`,
        });
      }
      return ctx.db.species.delete({ where: { id: input.id } });
    }),
});
