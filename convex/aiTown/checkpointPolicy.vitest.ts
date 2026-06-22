import { describe, expect, test } from 'vitest';
import { checkpointFingerprint, shouldCheckpoint } from './checkpointPolicy';
import { CHECKPOINT_INTERVAL_MS } from '../constants';
import type { SerializedWorld } from './world';

function baseWorld(): SerializedWorld {
  return {
    nextId: 5,
    players: [
      {
        id: 'p:1',
        lastInput: 0,
        position: { x: 1, y: 1 },
        facing: { dx: 1, dy: 0 },
        speed: 0,
      },
      {
        id: 'p:2',
        lastInput: 0,
        position: { x: 2, y: 2 },
        facing: { dx: 0, dy: 1 },
        speed: 0,
      },
    ],
    agents: [{ id: 'a:1', playerId: 'p:1' }],
    conversations: [
      {
        id: 'c:1',
        creator: 'p:1',
        created: 100,
        numMessages: 3,
        participants: [
          { playerId: 'p:1', invited: 100, status: { kind: 'participating', started: 110 } },
          { playerId: 'p:2', invited: 100, status: { kind: 'participating', started: 110 } },
        ],
      },
    ],
  };
}

describe('checkpointFingerprint', () => {
  test('ignores position, facing, speed, activity and typing', () => {
    const a = baseWorld();
    const b = baseWorld();
    // Move both players and toggle typing-only / activity-only fields.
    b.players[0].position = { x: 9, y: 9 };
    b.players[0].facing = { dx: 0, dy: -1 };
    b.players[1].speed = 1.5;
    b.players[1].activity = { description: 'reading', until: 999 };
    b.conversations[0].isTyping = { playerId: 'p:1', messageUuid: 'u', since: 1 };
    expect(checkpointFingerprint(b)).toBe(checkpointFingerprint(a));
  });

  test('changes when player/agent/conversation composition changes', () => {
    const base = checkpointFingerprint(baseWorld());

    const extraPlayer = baseWorld();
    extraPlayer.players.push({
      id: 'p:3',
      lastInput: 0,
      position: { x: 0, y: 0 },
      facing: { dx: 1, dy: 0 },
      speed: 0,
    });
    expect(checkpointFingerprint(extraPlayer)).not.toBe(base);

    const extraAgent = baseWorld();
    extraAgent.agents.push({ id: 'a:2', playerId: 'p:2' });
    expect(checkpointFingerprint(extraAgent)).not.toBe(base);

    const noConversation = baseWorld();
    noConversation.conversations = [];
    expect(checkpointFingerprint(noConversation)).not.toBe(base);

    const moreMessages = baseWorld();
    moreMessages.conversations[0].numMessages = 4;
    expect(checkpointFingerprint(moreMessages)).not.toBe(base);
  });
});

describe('shouldCheckpoint', () => {
  const fingerprint = 'fp';

  test('checkpoints once the interval elapses even without structural change', () => {
    expect(
      shouldCheckpoint({
        now: CHECKPOINT_INTERVAL_MS,
        lastCheckpointAt: 0,
        fingerprint,
        lastFingerprint: fingerprint,
      }),
    ).toBe(true);
  });

  test('does not checkpoint before the interval when fingerprint is unchanged', () => {
    expect(
      shouldCheckpoint({
        now: CHECKPOINT_INTERVAL_MS - 1,
        lastCheckpointAt: 0,
        fingerprint,
        lastFingerprint: fingerprint,
      }),
    ).toBe(false);
  });

  test('checkpoints before the interval when fingerprint changes', () => {
    expect(
      shouldCheckpoint({
        now: CHECKPOINT_INTERVAL_MS - 1,
        lastCheckpointAt: 0,
        fingerprint: 'changed',
        lastFingerprint: fingerprint,
      }),
    ).toBe(true);
  });
});
