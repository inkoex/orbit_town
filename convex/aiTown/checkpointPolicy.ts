import { CHECKPOINT_INTERVAL_MS } from '../constants';
import type { SerializedWorld } from './world';

// A structural fingerprint of the world. It intentionally captures only the
// data whose change warrants an immediate authoritative checkpoint (players,
// agents, and conversation structure) and excludes high-churn render data
// (position, facing, speed, activity, typing, historicalLocations) which is
// covered by the 30s interval instead.
export function checkpointFingerprint(world: SerializedWorld): string {
  const players = [...world.players]
    .map((p) => p.id)
    .sort();
  const agents = [...world.agents]
    .map((a) => a.id)
    .sort();
  const conversations = [...world.conversations]
    .map((c) => ({
      id: c.id,
      creator: c.creator,
      created: c.created,
      numMessages: c.numMessages,
      lastMessage: c.lastMessage ?? null,
      participants: [...c.participants]
        .map((m) => ({ playerId: m.playerId, status: m.status.kind }))
        .sort((a, b) => (a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0)),
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return JSON.stringify({ nextId: world.nextId, players, agents, conversations });
}

// The authoritative checkpoint never carries historicalLocations: that
// high-churn interpolation data is delivered by the render snapshot instead, so
// excluding it keeps the recovery checkpoint small.
export function toCheckpoint(world: SerializedWorld): SerializedWorld {
  const { historicalLocations: _omit, ...rest } = world;
  return rest;
}

export function shouldCheckpoint(args: {
  now: number;
  lastCheckpointAt: number;
  fingerprint: string;
  lastFingerprint: string;
}): boolean {
  if (args.now - args.lastCheckpointAt >= CHECKPOINT_INTERVAL_MS) {
    return true;
  }
  return args.fingerprint !== args.lastFingerprint;
}
