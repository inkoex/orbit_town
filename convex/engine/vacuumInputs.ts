import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { internal } from '../_generated/api';
import { Id } from '../_generated/dataModel';
import { DELETE_BATCH_SIZE, INPUT_RETENTION_MS } from '../constants';

// Processed engine inputs are the dominant source of unbounded storage growth:
// one row is inserted per input and never removed by the engine itself. This
// hourly job deletes inputs that are both (a) older than the retention window and
// (b) already consumed by the engine (`number <= processedInputNumber`), so we
// never drop inputs the engine has not yet processed.
export const startVacuumProcessedInputs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const before = Date.now() - INPUT_RETENTION_MS;
    await ctx.scheduler.runAfter(0, internal.engine.vacuumInputs.vacuumProcessedInputsPage, {
      before,
      cursor: null,
      soFar: 0,
    });
  },
});

export const vacuumProcessedInputsPage = internalMutation({
  args: {
    before: v.number(),
    cursor: v.union(v.string(), v.null()),
    soFar: v.number(),
  },
  handler: async (ctx, { before, cursor, soFar }) => {
    const results = await ctx.db
      .query('inputs')
      .withIndex('by_received', (q) => q.lt('received', before))
      .paginate({ cursor, numItems: DELETE_BATCH_SIZE });

    // Cache each engine's processed cursor so we read it at most once per page.
    const processedByEngine = new Map<Id<'engines'>, number>();
    let deleted = 0;
    for (const input of results.page) {
      let processed = processedByEngine.get(input.engineId);
      if (processed === undefined) {
        const engine = await ctx.db.get(input.engineId);
        processed = engine?.processedInputNumber ?? -1;
        processedByEngine.set(input.engineId, processed);
      }
      if (input.number <= processed) {
        await ctx.db.delete(input._id);
        deleted += 1;
      }
    }

    if (!results.isDone) {
      await ctx.scheduler.runAfter(0, internal.engine.vacuumInputs.vacuumProcessedInputsPage, {
        before,
        cursor: results.continueCursor,
        soFar: soFar + deleted,
      });
    } else {
      console.log(`Vacuumed ${soFar + deleted} processed inputs`);
    }
  },
});
