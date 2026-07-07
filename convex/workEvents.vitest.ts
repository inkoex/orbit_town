/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import schema from './schema';
import { modules } from './test.modules';
import { api } from './_generated/api';

describe('workEvents.clearSource', () => {
  test('deletes only the requested source and returns the count', async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.workEvents.push, { source: 'fake', type: 'run_started', summary: 'a' });
    await t.mutation(api.workEvents.push, { source: 'fake', type: 'run_finished', summary: 'b' });
    await t.mutation(api.workEvents.push, { source: 'real', type: 'agent_message', summary: 'keep me' });

    const res = await t.mutation(api.workEvents.clearSource, { source: 'fake' });
    expect(res).toEqual({ deleted: 2 });

    const rest = await t.query(api.workEvents.list, {});
    expect(rest).toHaveLength(1);
    expect(rest[0].source).toBe('real');
  });

  test('clearing an absent source deletes nothing', async () => {
    const t = convexTest(schema, modules);
    const res = await t.mutation(api.workEvents.clearSource, { source: 'fake' });
    expect(res).toEqual({ deleted: 0 });
  });
});
