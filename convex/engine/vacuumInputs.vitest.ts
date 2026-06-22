/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import schema from '../schema';
import { modules } from '../test.modules';
import { internal } from '../_generated/api';
import { INPUT_RETENTION_MS } from '../constants';
import type { Id } from '../_generated/dataModel';
import { engineInsertInput } from './abstractGame';

const TWO_HOURS = 2 * 60 * 60 * 1000;
const THIRTY_MINUTES = 30 * 60 * 1000;

describe('vacuumProcessedInputsPage', () => {
  test('deletes only processed inputs older than the retention window', async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    const before = now - INPUT_RETENTION_MS;

    let processedOld!: Id<'inputs'>;
    let unprocessedOld!: Id<'inputs'>;
    let processedRecent!: Id<'inputs'>;
    await t.run(async (ctx) => {
      const engineId = await ctx.db.insert('engines', {
        generationNumber: 1,
        running: true,
        processedInputNumber: 5,
      });
      // Processed (number <= 5) and older than retention -> should be deleted.
      processedOld = await ctx.db.insert('inputs', {
        engineId,
        number: 3,
        name: 'noop',
        args: {},
        received: now - TWO_HOURS,
        returnValue: { kind: 'ok', value: null },
      });
      // Not yet processed (number > 5) even though old -> must be kept.
      unprocessedOld = await ctx.db.insert('inputs', {
        engineId,
        number: 9,
        name: 'noop',
        args: {},
        received: now - TWO_HOURS,
      });
      // Processed but still within the retention window -> kept.
      processedRecent = await ctx.db.insert('inputs', {
        engineId,
        number: 4,
        name: 'noop',
        args: {},
        received: now - THIRTY_MINUTES,
      });
    });

    await t.mutation(internal.engine.vacuumInputs.vacuumProcessedInputsPage, {
      before,
      cursor: null,
      soFar: 0,
    });

    await t.run(async (ctx) => {
      expect(await ctx.db.get(processedOld)).toBeNull();
      expect(await ctx.db.get(unprocessedOld)).not.toBeNull();
      expect(await ctx.db.get(processedRecent)).not.toBeNull();
    });
  });
});

describe('engineInsertInput', () => {
  test('assigns numbers above processedInputNumber after vacuum empties the table', async () => {
    const t = convexTest(schema, modules);
    let assignedNumber!: number;
    await t.run(async (ctx) => {
      const engineId = await ctx.db.insert('engines', {
        generationNumber: 1,
        running: true,
        processedInputNumber: 1808,
      });
      // Post-vacuum state: every processed row was deleted, so the inputs table
      // is empty even though the engine has already advanced to number 1808.
      const inputId = await engineInsertInput(ctx, engineId, 'finishDoSomething', {});
      const input = await ctx.db.get(inputId);
      assignedNumber = input!.number;
    });
    // Regression (a729fd4): the prevInput-based counter restarted at 0 here,
    // and the step loop's gt('number', processedInputNumber) cursor would skip
    // those inputs forever, freezing every agent on a timed-out operation.
    expect(assignedNumber).toBeGreaterThan(1808);
  });
});
