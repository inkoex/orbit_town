import { internalMutation } from './_generated/server';

// One-off: recast the 6 iso agents onto distinct avatars WITHOUT a full reseed.
// The sprite reads playerDescriptions.character reactively, so patching these
// rows swaps avatars live — no wipe, no engine resume, the world can stay
// Frozen, ~6 writes total. Keeps Convex usage near zero.
//
// Run: npx convex run recastAvatars:recast
// (Safe to re-run; only patches rows whose character differs. Delete this file
// once a proper reseed path exists, or keep as a dev utility.)
const CAST: Record<string, string> = {
  Nova: 'iso-agent-5',
  Orion: 'iso-agent-4',
  Vega: 'iso-agent-2',
  Lyra: 'iso-agent-3',
  Atlas: 'iso-agent-7',
  Iris: 'iso-agent-1',
};

export const recast = internalMutation({
  args: {},
  handler: async (ctx) => {
    const worldStatus = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .unique();
    if (!worldStatus) throw new Error('no default world');
    const descs = await ctx.db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', worldStatus.worldId))
      .collect();
    let patched = 0;
    for (const d of descs) {
      const next = CAST[d.name];
      if (next && next !== d.character) {
        await ctx.db.patch(d._id, { character: next });
        patched++;
      }
    }
    console.log(`recast ${patched} avatars`, CAST);
    return { patched, total: descs.length };
  },
});
