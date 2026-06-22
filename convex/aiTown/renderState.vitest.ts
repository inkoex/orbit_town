/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import schema from '../schema';
import { modules } from '../test.modules';
import { buildRenderState, upsertRenderState } from './renderState';
import { World, type SerializedWorld } from './world';
import type { Id } from '../_generated/dataModel';

function fixtureWorld(): SerializedWorld {
  return {
    nextId: 9,
    players: [
      {
        id: 'p:1',
        lastInput: 0,
        position: { x: 1, y: 1 },
        facing: { dx: 1, dy: 0 },
        speed: 0,
        activity: { description: 'reading', until: 5000 },
      },
      {
        id: 'p:2',
        lastInput: 0,
        position: { x: 2, y: 3 },
        facing: { dx: 0, dy: 1 },
        speed: 1,
      },
    ],
    agents: [
      {
        id: 'a:1',
        playerId: 'p:1',
        inProgressOperation: { name: 'agentDoSomething', operationId: 'o:1', started: 100 },
      },
    ],
    conversations: [
      {
        id: 'c:1',
        creator: 'p:1',
        created: 10,
        numMessages: 0,
        isTyping: { playerId: 'p:2', messageUuid: 'm', since: 50 },
        participants: [
          { playerId: 'p:1', invited: 10, status: { kind: 'participating', started: 20 } },
          { playerId: 'p:2', invited: 10, status: { kind: 'participating', started: 20 } },
        ],
      },
    ],
  };
}

describe('buildRenderState', () => {
  test('captures only compact render fields', () => {
    const world = new World(fixtureWorld());
    const state = buildRenderState({
      worldId: 'world1' as Id<'worlds'>,
      engineGeneration: 3,
      simulationTime: 1234,
      world,
    });
    expect(state.players.map((p) => p.playerId).sort()).toEqual(['p:1', 'p:2']);
    expect(state.typingPlayerIds).toEqual(['p:2']);
    expect(state.thinkingPlayerIds).toEqual(['p:1']);

    const json = JSON.stringify(state);
    for (const forbidden of ['worldMap', 'identity', 'messages', 'tileSetUrl', 'plan']) {
      expect(json).not.toContain(forbidden);
    }
  });
});

describe('upsertRenderState', () => {
  test('keeps exactly one document per world and updates it', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const worldId = await ctx.db.insert('worlds', {
        nextId: 0,
        players: [],
        agents: [],
        conversations: [],
      });
      const base = {
        worldId,
        engineGeneration: 1,
        simulationTime: 100,
        players: [],
        typingPlayerIds: [],
        thinkingPlayerIds: [],
      };
      await upsertRenderState(ctx, base);
      await upsertRenderState(ctx, { ...base, simulationTime: 200 });

      const docs = await ctx.db
        .query('worldRenderStates')
        .withIndex('by_worldId', (q) => q.eq('worldId', worldId))
        .collect();
      expect(docs.length).toBe(1);
      expect(docs[0].simulationTime).toBe(200);
    });
  });
});
