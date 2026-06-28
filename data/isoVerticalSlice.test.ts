import { mapwidth, mapheight, objmap, spawnPoints, PLATFORMS, BRIDGES } from './isoVerticalSlice';

// objmap[0] is the collision layer, indexed [x][y]: -1 = walkable, else blocked.
const collision = objmap[0];
const walkable = (x: number, y: number) =>
  x >= 0 && y >= 0 && x < mapwidth && y < mapheight && collision[x][y] === -1;

const rectTiles = (r: { x: number; y: number; w: number; h: number }) => {
  const out: Array<[number, number]> = [];
  for (let x = r.x; x < r.x + r.w; x++) for (let y = r.y; y < r.y + r.h; y++) out.push([x, y]);
  return out;
};

describe('iso archipelago map', () => {
  test('bounding grid is 20x16', () => {
    expect(mapwidth).toBe(20);
    expect(mapheight).toBe(16);
  });

  test('every platform and bridge tile is walkable', () => {
    for (const p of PLATFORMS) {
      for (const [x, y] of rectTiles(p.rect)) expect(walkable(x, y)).toBe(true);
    }
    for (const b of BRIDGES) {
      for (const [x, y] of rectTiles(b)) expect(walkable(x, y)).toBe(true);
    }
  });

  test('the void between islands is blocked (not walkable)', () => {
    // corners and a known gap tile are outside every platform/bridge
    expect(walkable(0, 0)).toBe(false);
    expect(walkable(mapwidth - 1, mapheight - 1)).toBe(false);
    expect(walkable(0, mapheight - 1)).toBe(false);
  });

  test('all walkable tiles form ONE connected component (islands are bridged)', () => {
    const all: Array<[number, number]> = [];
    for (let x = 0; x < mapwidth; x++)
      for (let y = 0; y < mapheight; y++) if (collision[x][y] === -1) all.push([x, y]);
    expect(all.length).toBeGreaterThan(0);
    const key = (x: number, y: number) => `${x},${y}`;
    const seen = new Set<string>([key(all[0][0], all[0][1])]);
    const stack = [all[0]];
    while (stack.length) {
      const [x, y] = stack.pop()!;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as Array<[number, number]>) {
        const nx = x + dx,
          ny = y + dy;
        if (walkable(nx, ny) && !seen.has(key(nx, ny))) {
          seen.add(key(nx, ny));
          stack.push([nx, ny]);
        }
      }
    }
    // every walkable tile reachable from the first => single connected graph
    expect(seen.size).toBe(all.length);
  });

  test('walkable fraction >= 0.45 (random agent spawn stays safe)', () => {
    let w = 0;
    for (let x = 0; x < mapwidth; x++)
      for (let y = 0; y < mapheight; y++) if (collision[x][y] === -1) w++;
    expect(w / (mapwidth * mapheight)).toBeGreaterThanOrEqual(0.45);
  });

  test('spawn points sit on walkable tiles', () => {
    expect(walkable(spawnPoints.human.x, spawnPoints.human.y)).toBe(true);
    expect(walkable(spawnPoints.agents[0].x, spawnPoints.agents[0].y)).toBe(true);
  });

  test('there are 3 named platforms', () => {
    expect(PLATFORMS.map((p) => p.name)).toEqual(['CAFE', 'LIBRARY', 'EVENT']);
  });
});
