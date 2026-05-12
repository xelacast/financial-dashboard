import { configRouter } from "~/server/api/routers/config";
import { trackerRouter } from "~/server/api/routers/tracker";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  config: configRouter,
  tracker: trackerRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
