import bcrypt from "bcryptjs";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
    checkName: publicProcedure
        .input(z.object({ name: z.string().min(1).trim() }))
        .query(async ({ ctx, input }) => {
            const existing = await ctx.db.user.findFirst({
                where: { name: { equals: input.name, mode: "insensitive" } },
            });
            return {
                available: !existing,
                existingUser: !!existing,
            };
        }),

    register: publicProcedure
        .input(
            z.object({
                name: z.string().min(1).trim(),
                password: z.string().min(4),
                lodgeId: z.string(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const existing = await ctx.db.user.findFirst({
                where: { name: { equals: input.name, mode: "insensitive" } },
            });

            if (existing) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "That name is already taken",
                });
            }

            const slug = input.name.toLowerCase().replace(/\s+/g, "-");
            const email = `${slug}@klaserie.local`;
            const hashedPassword = await bcrypt.hash(input.password, 12);

            const user = await ctx.db.user.create({
                data: {
                    name: input.name,
                    email,
                    hashedPassword,
                    role: "GUIDE",
                    lodgeId: input.lodgeId,
                },
            });

            return { id: user.id, name: user.name };
        }),
});
