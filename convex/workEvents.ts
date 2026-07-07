import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { workEventFields } from './workEventsContract';

// The two sides of the neutral contract's socket:
//   push — any source (fake generator, Claude Code hook, Paperclip adapter…)
//          translates its native event into the contract and calls this.
//   list — the presentation subscribes to this and reacts. Nothing else.
//
// Dev note: push is a public mutation for now (single-user dev deployment;
// callable via `npx convex run workEvents:push '…'`). Before any shared
// deployment it must move behind auth or an httpAction with a shared secret.

export const push = mutation({
  args: workEventFields,
  returns: v.object({ sequence: v.number(), deduped: v.boolean() }),
  handler: async (ctx, args) => {
    // Idempotent ingest: a source retrying the same externalId is a no-op.
    if (args.externalId !== undefined) {
      const dup = await ctx.db
        .query('workEvents')
        .withIndex('sourceExternalId', (q) =>
          q.eq('source', args.source).eq('externalId', args.externalId),
        )
        .unique();
      if (dup) return { sequence: dup.sequence, deduped: true };
    }
    // Global monotonic sequence. Single-writer-at-a-time is fine at our scale;
    // Convex OCC retries the rare concurrent push.
    const latest = await ctx.db
      .query('workEvents')
      .withIndex('sequence')
      .order('desc')
      .first();
    const sequence = (latest?.sequence ?? 0) + 1;
    await ctx.db.insert('workEvents', { ...args, sequence });
    return { sequence, deduped: false };
  },
});

export const list = query({
  args: { count: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const n = Math.min(args.count ?? 20, 100); // always bounded
    return await ctx.db.query('workEvents').withIndex('sequence').order('desc').take(n);
  },
});

// Dev-only reset for replay tooling: wipes ONE source's events (e.g. the fake
// generator clearing its previous round) without touching other sources' data.
// Same caveat as push: public mutation for the single-user dev deployment —
// must move behind auth before any shared deployment.
export const clearSource = mutation({
  args: { source: v.string() },
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('workEvents')
      .withIndex('sourceExternalId', (q) => q.eq('source', args.source))
      .collect();
    await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
    return { deleted: rows.length };
  },
});
