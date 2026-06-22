import { ObjectType, v } from 'convex/values';
import { point, vector } from '../util/types';
import { activity } from './player';
import { playerId } from './ids';
import { World } from './world';
import type { Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';

// Compact, fixed-shape render snapshot for a world. This is the high-churn data
// the client needs every second (positions, facing, activity, typing/thinking).
// It deliberately excludes map, descriptions, identity, plans and conversation
// transcripts so the per-world document stays small.
export const serializedRenderState = {
  worldId: v.id('worlds'),
  engineGeneration: v.number(),
  simulationTime: v.number(),
  players: v.array(
    v.object({
      playerId,
      position: point,
      facing: vector,
      speed: v.number(),
      activity: v.optional(activity),
      historicalLocation: v.optional(v.bytes()),
    }),
  ),
  typingPlayerIds: v.array(playerId),
  thinkingPlayerIds: v.array(playerId),
};
export type WorldRenderState = ObjectType<typeof serializedRenderState>;

type RenderPlayer = WorldRenderState['players'][number];

export function buildRenderState(args: {
  worldId: Id<'worlds'>;
  engineGeneration: number;
  simulationTime: number;
  world: World;
  historicalLocations?: Map<string, ArrayBuffer>;
}): WorldRenderState {
  const { world } = args;
  const players = [...world.players.values()].map((p) => {
    const entry: RenderPlayer = {
      playerId: p.id,
      position: p.position,
      facing: p.facing,
      speed: p.speed,
    };
    if (p.activity) {
      entry.activity = p.activity;
    }
    const historicalLocation = args.historicalLocations?.get(p.id);
    if (historicalLocation) {
      entry.historicalLocation = historicalLocation;
    }
    return entry;
  });
  const typingPlayerIds = [...world.conversations.values()]
    .filter((c) => c.isTyping)
    .map((c) => c.isTyping!.playerId);
  const thinkingPlayerIds = [...world.agents.values()]
    .filter((a) => a.inProgressOperation)
    .map((a) => a.playerId);
  return {
    worldId: args.worldId,
    engineGeneration: args.engineGeneration,
    simulationTime: args.simulationTime,
    players,
    typingPlayerIds,
    thinkingPlayerIds,
  };
}

export async function upsertRenderState(ctx: MutationCtx, state: WorldRenderState): Promise<void> {
  // NOTE: `db.patch` still produces a new Convex document revision, so the
  // update method itself is not what bounds storage. The storage win comes from
  // keeping exactly one fixed-size document per world with a compact payload.
  const existing = await ctx.db
    .query('worldRenderStates')
    .withIndex('by_worldId', (q) => q.eq('worldId', state.worldId))
    .unique();
  if (existing === null) {
    await ctx.db.insert('worldRenderStates', state);
  } else {
    const { worldId: _worldId, ...fields } = state;
    await ctx.db.patch(existing._id, fields);
  }
}
