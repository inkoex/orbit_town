import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { agentTables } from './agent/schema';
import { aiTownTables } from './aiTown/schema';
import { conversationId, playerId } from './aiTown/ids';
import { engineTables } from './engine/schema';
import { workEventFields } from './workEventsContract';

export default defineSchema({
  // Neutral work-event contract (see workEventsContract.ts). `sequence` is a
  // deployment-global monotonic counter assigned at ingest — the stable order
  // the presentation replays, independent of any source's own ordering.
  workEvents: defineTable({
    ...workEventFields,
    sequence: v.number(),
  })
    .index('sequence', ['sequence'])
    .index('sourceExternalId', ['source', 'externalId']),

  music: defineTable({
    storageId: v.string(),
    type: v.union(v.literal('background'), v.literal('player')),
  }),

  messages: defineTable({
    conversationId,
    messageUuid: v.string(),
    author: playerId,
    text: v.string(),
    worldId: v.optional(v.id('worlds')),
  })
    .index('conversationId', ['worldId', 'conversationId'])
    .index('messageUuid', ['conversationId', 'messageUuid']),

  ...agentTables,
  ...aiTownTables,
  ...engineTables,
});
