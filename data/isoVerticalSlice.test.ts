import { mapwidth, mapheight, objmap, spawnPoints } from './isoVerticalSlice';

const FURNITURE: Array<[number, number]> = [
  [4, 4],
  [4, 5],
  [5, 4],
  [5, 5],
  [7, 6],
];

describe('iso vertical slice map', () => {
  test('is 10x10', () => {
    expect(mapwidth).toBe(10);
    expect(mapheight).toBe(10);
  });

  test('border (36 outer tiles) and furniture are blocked, interior walkable', () => {
    const collision = objmap[0];
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const isBorder = x === 0 || y === 0 || x === 9 || y === 9;
        const isFurniture = FURNITURE.some(([fx, fy]) => fx === x && fy === y);
        if (isBorder || isFurniture) {
          expect(collision[x][y]).toBe(0);
        } else {
          expect(collision[x][y]).toBe(-1);
        }
      }
    }
  });

  test('spawn points place human and one agent on walkable interior tiles', () => {
    expect(spawnPoints).toEqual({
      human: { x: 2, y: 7 },
      agents: [{ x: 7, y: 2 }],
    });
    // spawn tiles must be walkable (-1)
    expect(objmap[0][spawnPoints.human.x][spawnPoints.human.y]).toBe(-1);
    expect(objmap[0][spawnPoints.agents[0].x][spawnPoints.agents[0].y]).toBe(-1);
  });
});
