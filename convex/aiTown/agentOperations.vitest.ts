import { describe, expect, test } from 'vitest';
import { Game } from './game';
import { GameId } from './ids';
import type { Doc, Id } from '../_generated/dataModel';

function fakeEngine(): Doc<'engines'> {
  return {
    _id: 'engine1' as Id<'engines'>,
    _creationTime: 0,
    generationNumber: 1,
    currentTime: 1000,
    running: true,
  };
}

function fakeGame(): Game {
  const state = {
    world: {
      nextId: 10,
      players: [
        {
          id: 'p:1',
          lastInput: 0,
          position: { x: 1, y: 1 },
          facing: { dx: 1, dy: 0 },
          speed: 0,
        },
      ],
      agents: [{ id: 'a:1', playerId: 'p:1' }],
      conversations: [],
    },
    playerDescriptions: [],
    agentDescriptions: [],
    worldMap: {
      width: 16,
      height: 16,
      tileSetUrl: 'https://example.com/tileset.png',
      tileSetDimX: 512,
      tileSetDimY: 512,
      tileDim: 32,
      bgTiles: [[[1]]],
      objectTiles: [[[-1]]],
      animatedSprites: [],
    },
  };
  return new Game(fakeEngine(), 'world1' as Id<'worlds'>, state);
}

describe('agentDoSomething scheduled payload', () => {
  test('does not embed the world map or candidate players, and stays small', () => {
    const game = fakeGame();
    const agent = game.world.agents.get('a:1' as GameId<'agents'>)!;
    agent.tick(game, 2000);

    const operation = game.pendingOperations.find((o) => o.name === 'agentDoSomething');
    expect(operation, 'expected agentDoSomething to be scheduled').toBeTruthy();

    const json = JSON.stringify(operation!.args);
    expect(json.length).toBeLessThan(16 * 1024);
    for (const forbidden of ['bgTiles', 'objectTiles', 'tileSetUrl', 'otherFreePlayers']) {
      expect(json).not.toContain(forbidden);
    }
    // The compact decision-time snapshot is still present.
    expect(operation!.args).toMatchObject({ worldId: 'world1', player: { id: 'p:1' }, agent: { id: 'a:1' } });
  });
});
