import { GameId } from '../../convex/aiTown/ids';
import { World } from '../../convex/aiTown/world';
import { Activity } from '../../convex/aiTown/player';
import { Point, Vector } from '../../convex/util/types';

// Structural shape of a worldRenderStates document (system fields omitted) so
// this stays a pure, unit-testable function with no Convex/React imports.
export type RenderStateInput = {
  engineGeneration: number;
  players: Array<{
    playerId: string;
    position: Point;
    facing: Vector;
    speed: number;
    activity?: Activity;
    historicalLocation?: ArrayBuffer;
  }>;
  typingPlayerIds: string[];
  thinkingPlayerIds: string[];
};

// Overlay the latest compact render snapshot onto the authoritative (possibly up
// to 30s stale) checkpoint world. Player/agent/conversation membership comes from
// the checkpoint; positions, facing, speed, activity and the interpolation
// buffers come from the snapshot. A snapshot from an older engine generation (or
// no snapshot) is ignored so we never render against mismatched state.
export function mergeRenderState(
  world: World,
  renderState: RenderStateInput | null | undefined,
  engineGeneration: number,
): World {
  if (!renderState || renderState.engineGeneration !== engineGeneration) {
    return world;
  }
  const historicalLocations = new Map<GameId<'players'>, ArrayBuffer>();
  for (const rp of renderState.players) {
    const playerId = rp.playerId as GameId<'players'>;
    const player = world.players.get(playerId);
    if (!player) {
      continue;
    }
    player.position = rp.position;
    player.facing = rp.facing;
    player.speed = rp.speed;
    player.activity = rp.activity;
    if (rp.historicalLocation) {
      historicalLocations.set(playerId, rp.historicalLocation);
    }
  }
  world.historicalLocations = historicalLocations;
  return world;
}

// Fresh typing/thinking sets come from the snapshot when it's current; otherwise
// fall back to the checkpoint's conversation/agent state.
export function renderTypingPlayerIds(
  world: World,
  renderState: RenderStateInput | null | undefined,
  engineGeneration: number,
): Set<string> {
  if (renderState && renderState.engineGeneration === engineGeneration) {
    return new Set(renderState.typingPlayerIds);
  }
  const ids = new Set<string>();
  for (const conversation of world.conversations.values()) {
    if (conversation.isTyping) {
      ids.add(conversation.isTyping.playerId);
    }
  }
  return ids;
}

export function renderThinkingPlayerIds(
  world: World,
  renderState: RenderStateInput | null | undefined,
  engineGeneration: number,
): Set<string> {
  if (renderState && renderState.engineGeneration === engineGeneration) {
    return new Set(renderState.thinkingPlayerIds);
  }
  const ids = new Set<string>();
  for (const agent of world.agents.values()) {
    if (agent.inProgressOperation) {
      ids.add(agent.playerId);
    }
  }
  return ids;
}
