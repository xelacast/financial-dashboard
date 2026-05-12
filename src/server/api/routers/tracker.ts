import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { lineItem, monthEntry, recurringTemplate } from "~/server/db/schema";

export const trackerRouter = createTRPCRouter({
  // Returns all month entries for a year with aggregated line item totals.
  getYear: protectedProcedure
    .input(z.object({ year: z.number().int().min(2000).max(2100) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const entries = await ctx.db
        .select()
        .from(monthEntry)
        .where(
          and(eq(monthEntry.userId, userId), eq(monthEntry.year, input.year)),
        );

      const result = await Promise.all(
        entries.map(async (entry) => {
          const items = await ctx.db
            .select()
            .from(lineItem)
            .where(eq(lineItem.monthEntryId, entry.id));
          const realItems = items.filter((i) => !i.isHypothetical);
          const totalIncome = realItems
            .filter((i) => i.type === "income")
            .reduce((sum, i) => sum + i.amount, 0);
          const totalExpenses = realItems
            .filter((i) => i.type === "expense")
            .reduce((sum, i) => sum + i.amount, 0);
          const checkedIncome = realItems
            .filter((i) => i.type === "income" && i.isChecked)
            .reduce((sum, i) => sum + i.amount, 0);
          const checkedExpenses = realItems
            .filter((i) => i.type === "expense" && i.isChecked)
            .reduce((sum, i) => sum + i.amount, 0);
          return {
            ...entry,
            projectedCashFlow: totalIncome - totalExpenses,
            actualCashFlow: checkedIncome - checkedExpenses,
          };
        }),
      );

      return result;
    }),

  // Returns a single month entry with all line items. Auto-creates + populates
  // from recurring templates on first visit.
  getMonth: protectedProcedure
    .input(
      z.object({
        year: z.number().int().min(2000).max(2100),
        month: z.number().int().min(1).max(12),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      let [entry] = await ctx.db
        .select()
        .from(monthEntry)
        .where(
          and(
            eq(monthEntry.userId, userId),
            eq(monthEntry.year, input.year),
            eq(monthEntry.month, input.month),
          ),
        )
        .limit(1);

      if (!entry) {
        const id = crypto.randomUUID();
        await ctx.db.insert(monthEntry).values({
          id,
          userId,
          year: input.year,
          month: input.month,
          startingBalance: 0,
          notes: "",
        });

        const templates = await ctx.db
          .select()
          .from(recurringTemplate)
          .where(eq(recurringTemplate.userId, userId));

        if (templates.length > 0) {
          await ctx.db.insert(lineItem).values(
            templates.map((t) => ({
              id: crypto.randomUUID(),
              monthEntryId: id,
              userId,
              name: t.name,
              type: t.type,
              amount: t.defaultAmount,
              category: t.category,
              isChecked: false,
              isHypothetical: false,
              templateId: t.id,
            })),
          );
        }

        const [newEntry] = await ctx.db
          .select()
          .from(monthEntry)
          .where(eq(monthEntry.id, id))
          .limit(1);

        entry = newEntry!;
      }

      const items = await ctx.db
        .select()
        .from(lineItem)
        .where(eq(lineItem.monthEntryId, entry.id));

      return { entry, items };
    }),

  updateMonthEntry: protectedProcedure
    .input(
      z.object({
        year: z.number().int(),
        month: z.number().int().min(1).max(12),
        startingBalance: z.number().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const [entry] = await ctx.db
        .select()
        .from(monthEntry)
        .where(
          and(
            eq(monthEntry.userId, userId),
            eq(monthEntry.year, input.year),
            eq(monthEntry.month, input.month),
          ),
        )
        .limit(1);

      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Month entry not found" });

      await ctx.db
        .update(monthEntry)
        .set({
          ...(input.startingBalance !== undefined && {
            startingBalance: input.startingBalance,
          }),
          ...(input.notes !== undefined && { notes: input.notes }),
        })
        .where(eq(monthEntry.id, entry.id));
    }),

  upsertLineItem: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        monthEntryId: z.string(),
        name: z.string().min(1),
        type: z.enum(["expense", "income"]),
        amount: z.number().min(0),
        category: z.string().default(""),
        isChecked: z.boolean().default(false),
        isHypothetical: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the monthEntry belongs to the current user
      const [entry] = await ctx.db
        .select({ id: monthEntry.id })
        .from(monthEntry)
        .where(
          and(
            eq(monthEntry.id, input.monthEntryId),
            eq(monthEntry.userId, userId),
          ),
        )
        .limit(1);

      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Month entry not found" });

      if (input.id) {
        const result = await ctx.db
          .update(lineItem)
          .set({
            name: input.name,
            type: input.type,
            amount: input.amount,
            category: input.category,
            isChecked: input.isChecked,
            isHypothetical: input.isHypothetical,
          })
          .where(
            and(eq(lineItem.id, input.id), eq(lineItem.userId, userId)),
          )
          .returning({ id: lineItem.id });

        if (result.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Line item not found" });
        return { id: result[0]!.id };
      }

      const id = crypto.randomUUID();
      await ctx.db.insert(lineItem).values({
        id,
        monthEntryId: input.monthEntryId,
        userId,
        name: input.name,
        type: input.type,
        amount: input.amount,
        category: input.category,
        isChecked: input.isChecked,
        isHypothetical: input.isHypothetical,
      });
      return { id };
    }),

  deleteLineItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(lineItem)
        .where(
          and(
            eq(lineItem.id, input.id),
            eq(lineItem.userId, ctx.session.user.id),
          ),
        );
    }),

  // Copies all line items from the previous month into the current month.
  // Only runs if the target month entry exists and is empty (no line items).
  copyLastMonth: protectedProcedure
    .input(
      z.object({
        year: z.number().int(),
        month: z.number().int().min(1).max(12),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const prevYear = input.month === 1 ? input.year - 1 : input.year;
      const prevMonth = input.month === 1 ? 12 : input.month - 1;

      const [[currentEntry], [prevEntry]] = await Promise.all([
        ctx.db
          .select()
          .from(monthEntry)
          .where(
            and(
              eq(monthEntry.userId, userId),
              eq(monthEntry.year, input.year),
              eq(monthEntry.month, input.month),
            ),
          )
          .limit(1),
        ctx.db
          .select()
          .from(monthEntry)
          .where(
            and(
              eq(monthEntry.userId, userId),
              eq(monthEntry.year, prevYear),
              eq(monthEntry.month, prevMonth),
            ),
          )
          .limit(1),
      ]);

      if (!currentEntry || !prevEntry) return;

      const [existingItems, prevItems] = await Promise.all([
        ctx.db
          .select({ id: lineItem.id })
          .from(lineItem)
          .where(eq(lineItem.monthEntryId, currentEntry.id))
          .limit(1),
        ctx.db
          .select()
          .from(lineItem)
          .where(eq(lineItem.monthEntryId, prevEntry.id)),
      ]);

      if (existingItems.length > 0 || prevItems.length === 0) return;

      await ctx.db.insert(lineItem).values(
        prevItems.map((item) => ({
          id: crypto.randomUUID(),
          monthEntryId: currentEntry.id,
          userId,
          name: item.name,
          type: item.type,
          amount: item.amount,
          category: item.category,
          isChecked: false,
          isHypothetical: item.isHypothetical,
          templateId: item.templateId,
        })),
      );
    }),
});
