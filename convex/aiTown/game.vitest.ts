/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import schema from '../schema';
import { modules } from '../test.modules';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

describe('stopEngineForFailure', () => {
  test('stops only when the engine generation still matches', async () => {
    const t = convexTest(schema, modules);
    let engineId!: Id<'engines'>;
    await t.run(async (ctx) => {
      engineId = await ctx.db.insert('engines', { generationNumber: 5, running: true });
    });

    // Stale generation (a newer action superseded us) -> must NOT stop.
    await t.mutation(internal.aiTown.game.stopEngineForFailure, {
      engineId,
      expectedGenerationNumber: 4,
    });
    await t.run(async (ctx) => {
      expect((await ctx.db.get(engineId))!.running).toBe(true);
    });

    // Matching generation (we still own the engine) -> stop.
    await t.mutation(internal.aiTown.game.stopEngineForFailure, {
      engineId,
      expectedGenerationNumber: 5,
    });
    await t.run(async (ctx) => {
      expect((await ctx.db.get(engineId))!.running).toBe(false);
    });
  });
});
