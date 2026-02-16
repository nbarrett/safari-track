import { checklistRouter } from "~/server/api/routers/checklist";
import { driveRouter } from "~/server/api/routers/drive";
import { lodgeRouter } from "~/server/api/routers/lodge";
import { poiRouter } from "~/server/api/routers/poi";
import { settingsRouter } from "~/server/api/routers/settings";
import { sightingRouter } from "~/server/api/routers/sighting";
import { speciesRouter } from "~/server/api/routers/species";
import { stravaRouter } from "~/server/api/routers/strava";
import { userRouter } from "~/server/api/routers/user";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  checklist: checklistRouter,
  drive: driveRouter,
  lodge: lodgeRouter,
  poi: poiRouter,
  settings: settingsRouter,
  sighting: sightingRouter,
  species: speciesRouter,
  strava: stravaRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
