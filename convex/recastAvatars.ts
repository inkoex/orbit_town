import { internalMutation } from './_generated/server';
import { isoDescriptions } from '../data/characters';

// Dev utility: re-apply the seed's iso-agent casting to the LIVE world without a
// full reseed. The sprite reads playerDescriptions.character reactively, so
// patching these rows swaps avatars live — no wipe, no engine resume.
//
// Casting is DERIVED from isoDescriptions — the same single source of truth the
// seed (init.ts) uses — so it can never diverge from a fresh reseed. To change
// an avatar, edit isoDescriptions; this just pushes that intent onto rows that
// were seeded before the edit.
//
// Run: npx convex run recastAvatars:recast
// (Safe to re-run; only patches rows whose character differs.)
const CAST: Record<string, string> = Object.fromEntries(
  isoDescriptions.map((d) => [d.name, d.character]),
);

export const recast = internalMutation({
  args: {},
  handler: async (ctx) => {
    const worldStatus = await ctx.db
      .query('worldStatus')
      .filter((q) => q.eq(q.field('isDefault'), true))
      .unique();
    if (!worldStatus) throw new Error('no default world');
    // A running engine rewrites playerDescriptions from its in-memory checkpoint
    // (loaded at engine start, before this patch), so it would silently revert
    // these swaps on its next step. Require the world to be stopped/Frozen.
    if (worldStatus.status === 'running') {
      throw new Error(
        'world engine is running — freeze it first (a running engine reverts these ' +
          'patches on its next checkpoint). Stop it via `testing:stop` or the Freeze button, then re-run.',
      );
    }
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
