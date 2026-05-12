import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  debt,
  financialAccount,
  recurringTemplate,
} from "~/server/db/schema";

export const configRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const [templates, accounts, debts] = await Promise.all([
      ctx.db
        .select()
        .from(recurringTemplate)
        .where(eq(recurringTemplate.userId, userId)),
      ctx.db
        .select()
        .from(financialAccount)
        .where(eq(financialAccount.userId, userId)),
      ctx.db.select().from(debt).where(eq(debt.userId, userId)),
    ]);
    return { templates, accounts, debts };
  }),

  upsertTemplate: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        type: z.enum(["expense", "income"]),
        defaultAmount: z.number().min(0),
        category: z.string().default(""),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (input.id) {
        await ctx.db
          .update(recurringTemplate)
          .set({
            name: input.name,
            type: input.type,
            defaultAmount: input.defaultAmount,
            category: input.category,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(recurringTemplate.id, input.id),
              eq(recurringTemplate.userId, userId),
            ),
          );
        return { id: input.id };
      }
      const id = crypto.randomUUID();
      await ctx.db.insert(recurringTemplate).values({
        id,
        userId,
        name: input.name,
        type: input.type,
        defaultAmount: input.defaultAmount,
        category: input.category,
      });
      return { id };
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(recurringTemplate)
        .where(
          and(
            eq(recurringTemplate.id, input.id),
            eq(recurringTemplate.userId, ctx.session.user.id),
          ),
        );
    }),

  upsertFinancialAccount: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        type: z.enum(["checking", "savings", "credit_card", "loan"]),
        balance: z.number(),
        isDebt: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (input.id) {
        await ctx.db
          .update(financialAccount)
          .set({
            name: input.name,
            type: input.type,
            balance: input.balance,
            isDebt: input.isDebt,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(financialAccount.id, input.id),
              eq(financialAccount.userId, userId),
            ),
          );
        return { id: input.id };
      }
      const id = crypto.randomUUID();
      await ctx.db.insert(financialAccount).values({
        id,
        userId,
        name: input.name,
        type: input.type,
        balance: input.balance,
        isDebt: input.isDebt,
      });
      return { id };
    }),

  deleteFinancialAccount: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(financialAccount)
        .where(
          and(
            eq(financialAccount.id, input.id),
            eq(financialAccount.userId, ctx.session.user.id),
          ),
        );
    }),

  upsertDebt: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        totalOwed: z.number().min(0),
        monthlyPayment: z.number().min(0),
        accountId: z.string().nullable().default(null),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (input.id) {
        await ctx.db
          .update(debt)
          .set({
            name: input.name,
            totalOwed: input.totalOwed,
            monthlyPayment: input.monthlyPayment,
            accountId: input.accountId,
            updatedAt: new Date(),
          })
          .where(and(eq(debt.id, input.id), eq(debt.userId, userId)));
        return { id: input.id };
      }
      const id = crypto.randomUUID();
      await ctx.db.insert(debt).values({
        id,
        userId,
        name: input.name,
        totalOwed: input.totalOwed,
        monthlyPayment: input.monthlyPayment,
        accountId: input.accountId,
      });
      return { id };
    }),

  deleteDebt: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(debt)
        .where(
          and(
            eq(debt.id, input.id),
            eq(debt.userId, ctx.session.user.id),
          ),
        );
    }),
});
