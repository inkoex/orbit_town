import { mergeRenderState, RenderStateInput } from './mergeRenderState';
import { World, SerializedWorld } from '../../convex/aiTown/world';
import { GameId } from '../../convex/aiTown/ids';

function checkpointWorld(): World {
  const serialized: SerializedWorld = {
    nextId: 3,
    players: [
      {
        id: 'p:1',
        lastInput: 0,
        position: { x: 1, y: 1 },
        facing: { dx: 1, dy: 0 },
        speed: 0,
      },
    ],
    agents: [],
    conversations: [],
  };
  return new World(serialized);
}

function renderState(generation: number): RenderStateInput {
  return {
    engineGeneration: generation,
    players: [
      {
        playerId: 'p:1',
        position: { x: 4, y: 3 },
        facing: { dx: 0, dy: 1 },
        speed: 1,
      },
    ],
    typingPlayerIds: [],
    thinkingPlayerIds: [],
  };
}

const PLAYER = 'p:1' as GameId<'players'>;

test('overlays render position when the generation matches the engine', () => {
  const world = mergeRenderState(checkpointWorld(), renderState(5), 5);
  expect(world.players.get(PLAYER)!.position).toEqual({ x: 4, y: 3 });
});

test('keeps the checkpoint position when the render snapshot is stale', () => {
  const world = mergeRenderState(checkpointWorld(), renderState(4), 5);
  expect(world.players.get(PLAYER)!.position).toEqual({ x: 1, y: 1 });
});

test('keeps the checkpoint position when there is no render snapshot', () => {
  const world = mergeRenderState(checkpointWorld(), null, 5);
  expect(world.players.get(PLAYER)!.position).toEqual({ x: 1, y: 1 });
});
