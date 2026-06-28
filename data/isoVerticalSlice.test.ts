import { mapwidth, mapheight, objmap, spawnPoints } from './isoVerticalSlice';

describe('iso vertical slice map', () => {
  test('is 10x10', () => {
    expect(mapwidth).toBe(10);
    expect(mapheight).toBe(10);
  });

  test('the entire 10x10 interior is walkable (prototype furniture removed)', () => {
    const collision = objmap[0];
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        expect(collision[x][y]).toBe(-1);
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
