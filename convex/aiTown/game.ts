import { ConvexError, Infer, v } from 'convex/values';
import { Doc, Id } from '../_generated/dataModel';
import {
  ActionCtx,
  DatabaseReader,
  MutationCtx,
  internalMutation,
  internalQuery,
} from '../_generated/server';
import { World, SerializedWorld, serializedWorld } from './world';
import { WorldMap, SerializedWorldMap, serializedWorldMap } from './worldMap';
import {
  PlayerDescription,
  SerializedPlayerDescription,
  serializedPlayerDescription,
} from './playerDescription';
import { Location, locationFields, playerLocation } from './location';
import { runAgentOperation } from './agent';
import { GameId, IdTypes, allocGameId } from './ids';
import { InputArgs, InputNames, inputs } from './inputs';
import {
  AbstractGame,
  EngineUpdate,
  applyEngineUpdate,
  engineUpdate,
  loadEngine,
} from '../engine/abstractGame';
import { internal } from '../_generated/api';
import { HistoricalObject } from '../engine/historicalObject';
import {
  AgentDescription,
  SerializedAgentDescription,
  serializedAgentDescription,
} from './agentDescription';
import { parseMap, serializeMap } from '../util/object';
import {
  WorldRenderState,
  buildRenderState,
  serializedRenderState,
  upsertRenderState,
} from './renderState';
import { checkpointFingerprint, shouldCheckpoint, toCheckpoint } from './checkpointPolicy';

const gameState = v.object({
  world: v.object(serializedWorld),
  playerDescriptions: v.array(v.object(serializedPlayerDescription)),
  agentDescriptions: v.array(v.object(serializedAgentDescription)),
  worldMap: v.object(serializedWorldMap),
});
type GameState = Infer<typeof gameState>;

const agentOperationsValidator = v.array(v.object({ name: v.string(), args: v.any() }));

// The per-step payload sent from the action to `saveWorldStep`. The render state
// is sent every step (~1s); the authoritative checkpoint (and any description /
// map changes) is only attached when `shouldCheckpoint` says so (every 30s or on
// a structural change).
type WorldStepPayload = {
  engineId: Id<'engines'>;
  engineUpdate: EngineUpdate;
  worldId: Id<'worlds'>;
  renderState: WorldRenderState;
  checkpoint?: SerializedWorld;
  playerDescriptions?: SerializedPlayerDescription[];
  agentDescriptions?: SerializedAgentDescription[];
  worldMap?: SerializedWorldMap;
  agentOperations: Array<{ name: string; args: any }>;
};

export class Game extends AbstractGame {
  tickDuration = 16;
  stepDuration = 1000;
  maxTicksPerStep = 600;
  maxInputsPerStep = 32;

  world: World;

  historicalLocations: Map<GameId<'players'>, HistoricalObject<Location>>;

  descriptionsModified: boolean;
  worldMap: WorldMap;
  playerDescriptions: Map<GameId<'players'>, PlayerDescription>;
  agentDescriptions: Map<GameId<'agents'>, AgentDescription>;

  pendingOperations: Array<{ name: string; args: any }> = [];

  numPathfinds: number;

  // Authoritative checkpoint bookkeeping, advanced only after a successful save.
  lastCheckpointAt: number;
  lastFingerprint: string;

  constructor(
    engine: Doc<'engines'>,
    public worldId: Id<'worlds'>,
    state: GameState,
  ) {
    super(engine);

    this.world = new World(state.world);
    delete this.world.historicalLocations;

    // The world was just loaded from a checkpoint, so treat now as the last
    // checkpoint time and seed the structural fingerprint to avoid an immediate
    // redundant checkpoint on the first step.
    this.lastCheckpointAt = engine.currentTime ?? Date.now();
    this.lastFingerprint = checkpointFingerprint(state.world);

    this.descriptionsModified = false;
    this.worldMap = new WorldMap(state.worldMap);
    this.agentDescriptions = parseMap(state.agentDescriptions, AgentDescription, (a) => a.agentId);
    this.playerDescriptions = parseMap(
      state.playerDescriptions,
      PlayerDescription,
      (p) => p.playerId,
    );

    this.historicalLocations = new Map();

    this.numPathfinds = 0;
  }

  static async load(
    db: DatabaseReader,
    worldId: Id<'worlds'>,
    generationNumber: number,
  ): Promise<{ engine: Doc<'engines'>; gameState: GameState }> {
    const worldDoc = await db.get(worldId);
    if (!worldDoc) {
      throw new Error(`No world found with id ${worldId}`);
    }
    const worldStatus = await db
      .query('worldStatus')
      .withIndex('worldId', (q) => q.eq('worldId', worldId))
      .unique();
    if (!worldStatus) {
      throw new Error(`No engine found for world ${worldId}`);
    }
    const engine = await loadEngine(db, worldStatus.engineId, generationNumber);
    const playerDescriptionsDocs = await db
      .query('playerDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', worldId))
      .collect();
    const agentDescriptionsDocs = await db
      .query('agentDescriptions')
      .withIndex('worldId', (q) => q.eq('worldId', worldId))
      .collect();
    const worldMapDoc = await db
      .query('maps')
      .withIndex('worldId', (q) => q.eq('worldId', worldId))
      .unique();
    if (!worldMapDoc) {
      throw new Error(`No map found for world ${worldId}`);
    }
    // Discard the system fields and historicalLocations from the world state.
    const { _id, _creationTime, historicalLocations: _, ...world } = worldDoc;
    const playerDescriptions = playerDescriptionsDocs
      // Discard player descriptions for players that no longer exist.
      .filter((d) => !!world.players.find((p) => p.id === d.playerId))
      .map(({ _id, _creationTime, worldId: _, ...doc }) => doc);
    const agentDescriptions = agentDescriptionsDocs
      .filter((a) => !!world.agents.find((p) => p.id === a.agentId))
      .map(({ _id, _creationTime, worldId: _, ...doc }) => doc);
    const {
      _id: _mapId,
      _creationTime: _mapCreationTime,
      worldId: _mapWorldId,
      ...worldMap
    } = worldMapDoc;
    return {
      engine,
      gameState: {
        world,
        playerDescriptions,
        agentDescriptions,
        worldMap,
      },
    };
  }

  allocId<T extends IdTypes>(idType: T): GameId<T> {
    const id = allocGameId(idType, this.world.nextId);
    this.world.nextId += 1;
    return id;
  }

  scheduleOperation(name: string, args: unknown) {
    this.pendingOperations.push({ name, args });
  }

  handleInput<Name extends InputNames>(now: number, name: Name, args: InputArgs<Name>) {
    const handler = inputs[name]?.handler;
    if (!handler) {
      throw new Error(`Invalid input: ${name}`);
    }
    return handler(this, now, args as any);
  }

  beginStep(_now: number) {
    // Store the current location of all players in the history tracking buffer.
    this.historicalLocations.clear();
    for (const player of this.world.players.values()) {
      this.historicalLocations.set(
        player.id,
        new HistoricalObject(locationFields, playerLocation(player)),
      );
    }
    this.numPathfinds = 0;
  }

  tick(now: number) {
    for (const player of this.world.players.values()) {
      player.tick(this, now);
    }
    for (const player of this.world.players.values()) {
      player.tickPathfinding(this, now);
    }
    for (const player of this.world.players.values()) {
      player.tickPosition(this, now);
    }
    for (const conversation of this.world.conversations.values()) {
      conversation.tick(this, now);
    }
    for (const agent of this.world.agents.values()) {
      agent.tick(this, now);
    }

    // Save each player's location into the history buffer at the end of
    // each tick.
    for (const player of this.world.players.values()) {
      let historicalObject = this.historicalLocations.get(player.id);
      if (!historicalObject) {
        historicalObject = new HistoricalObject(locationFields, playerLocation(player));
        this.historicalLocations.set(player.id, historicalObject);
      }
      historicalObject.update(now, playerLocation(player));
    }
  }

  async saveStep(ctx: ActionCtx, engineUpdate: EngineUpdate): Promise<void> {
    const simulationTime = this.engine.currentTime ?? Date.now();
    const engineGeneration = engineUpdate.engine.generationNumber;

    // Pack this step's location history for interpolation and hand it to the
    // compact render snapshot (never to the authoritative checkpoint).
    const historicalLocations = this.packHistoricalLocations();
    const renderState = buildRenderState({
      worldId: this.worldId,
      engineGeneration,
      simulationTime,
      world: this.world,
      historicalLocations,
    });

    const serialized = this.world.serialize();
    const fingerprint = checkpointFingerprint(serialized);
    const includeCheckpoint = shouldCheckpoint({
      now: simulationTime,
      lastCheckpointAt: this.lastCheckpointAt,
      fingerprint,
      lastFingerprint: this.lastFingerprint,
    });

    const payload: WorldStepPayload = {
      engineId: this.engine._id,
      engineUpdate,
      worldId: this.worldId,
      renderState,
      agentOperations: this.pendingOperations,
    };
    let includedDescriptions = false;
    if (includeCheckpoint) {
      payload.checkpoint = toCheckpoint(serialized);
      if (this.descriptionsModified) {
        payload.playerDescriptions = serializeMap(this.playerDescriptions);
        payload.agentDescriptions = serializeMap(this.agentDescriptions);
        payload.worldMap = this.worldMap.serialize();
        includedDescriptions = true;
      }
    }

    await this.runSaveWorldStep(ctx, payload);

    // Only advance local bookkeeping after the save committed.
    this.pendingOperations = [];
    if (includeCheckpoint) {
      this.lastCheckpointAt = simulationTime;
      this.lastFingerprint = fingerprint;
      if (includedDescriptions) {
        this.descriptionsModified = false;
      }
    }
  }

  // Force a full authoritative checkpoint at the end of an action so at most one
  // step (~1s) of unsaved structural progress is ever lost.
  async finishAction(ctx: ActionCtx): Promise<void> {
    const checkpoint = toCheckpoint(this.world.serialize());
    const args: {
      engineId: Id<'engines'>;
      expectedGenerationNumber: number;
      worldId: Id<'worlds'>;
      checkpoint: SerializedWorld;
      playerDescriptions?: SerializedPlayerDescription[];
      agentDescriptions?: SerializedAgentDescription[];
      worldMap?: SerializedWorldMap;
    } = {
      engineId: this.engine._id,
      expectedGenerationNumber: this.engine.generationNumber,
      worldId: this.worldId,
      checkpoint,
    };
    if (this.descriptionsModified) {
      args.playerDescriptions = serializeMap(this.playerDescriptions);
      args.agentDescriptions = serializeMap(this.agentDescriptions);
      args.worldMap = this.worldMap.serialize();
    }
    await ctx.runMutation(internal.aiTown.game.finishWorldAction, args);
    this.lastCheckpointAt = this.engine.currentTime ?? Date.now();
    this.lastFingerprint = checkpointFingerprint(this.world.serialize());
    this.descriptionsModified = false;
  }

  packHistoricalLocations(): Map<string, ArrayBuffer> {
    const historicalLocations = new Map<string, ArrayBuffer>();
    let bufferSize = 0;
    for (const [id, historicalObject] of this.historicalLocations.entries()) {
      const buffer = historicalObject.pack();
      if (!buffer) {
        continue;
      }
      historicalLocations.set(id, buffer);
      bufferSize += buffer.byteLength;
    }
    if (bufferSize > 0) {
      console.debug(
        `Packed ${historicalLocations.size} history buffers in ${(bufferSize / 1024).toFixed(
          2,
        )}KiB.`,
      );
    }
    this.historicalLocations.clear();
    return historicalLocations;
  }

  // Saves a step, retrying once on a transient failure. If it still fails, make a
  // best-effort full checkpoint and stop the engine rather than spin on a failing
  // write. Control-flow errors (generation mismatch / engine stopped) propagate
  // untouched so a superseding action isn't disrupted.
  async runSaveWorldStep(ctx: ActionCtx, payload: WorldStepPayload): Promise<void> {
    try {
      await ctx.runMutation(internal.aiTown.game.saveWorldStep, payload);
      return;
    } catch (e) {
      if (isControlFlowError(e)) {
        throw e;
      }
      console.error(`saveWorldStep failed, retrying once: ${errorMessage(e)}`);
    }
    try {
      await ctx.runMutation(internal.aiTown.game.saveWorldStep, payload);
      return;
    } catch (e) {
      if (isControlFlowError(e)) {
        throw e;
      }
      console.error(`saveWorldStep failed twice; forcing checkpoint and stopping engine`);
      try {
        await ctx.runMutation(internal.aiTown.game.saveWorldStep, {
          ...payload,
          checkpoint: toCheckpoint(this.world.serialize()),
        });
      } catch (forceErr) {
        console.error(`Forced checkpoint also failed: ${errorMessage(forceErr)}`);
      }
      await ctx.runMutation(internal.aiTown.game.stopEngineForFailure, {
        engineId: this.engine._id,
      });
      throw e;
    }
  }

  static async saveCheckpoint(
    ctx: MutationCtx,
    worldId: Id<'worlds'>,
    checkpoint: {
      world: SerializedWorld;
      playerDescriptions?: SerializedPlayerDescription[];
      agentDescriptions?: SerializedAgentDescription[];
      worldMap?: SerializedWorldMap;
    },
  ) {
    const existingWorld = await ctx.db.get(worldId);
    if (!existingWorld) {
      throw new Error(`No world found with id ${worldId}`);
    }
    const newWorld = checkpoint.world;
    // Archive newly deleted players, conversations, and agents.
    for (const player of existingWorld.players) {
      if (!newWorld.players.some((p) => p.id === player.id)) {
        await ctx.db.insert('archivedPlayers', { worldId, ...player });
      }
    }
    for (const conversation of existingWorld.conversations) {
      if (!newWorld.conversations.some((c) => c.id === conversation.id)) {
        const participants = conversation.participants.map((p) => p.playerId);
        const archivedConversation = {
          worldId,
          id: conversation.id,
          created: conversation.created,
          creator: conversation.creator,
          ended: Date.now(),
          lastMessage: conversation.lastMessage,
          numMessages: conversation.numMessages,
          participants,
        };
        await ctx.db.insert('archivedConversations', archivedConversation);
        for (let i = 0; i < participants.length; i++) {
          for (let j = 0; j < participants.length; j++) {
            if (i == j) {
              continue;
            }
            const player1 = participants[i];
            const player2 = participants[j];
            await ctx.db.insert('participatedTogether', {
              worldId,
              conversationId: conversation.id,
              player1,
              player2,
              ended: Date.now(),
            });
          }
        }
      }
    }
    for (const conversation of existingWorld.agents) {
      if (!newWorld.agents.some((a) => a.id === conversation.id)) {
        await ctx.db.insert('archivedAgents', { worldId, ...conversation });
      }
    }
    // Update the world state.
    await ctx.db.replace(worldId, newWorld);

    // Update the larger description tables if they changed.
    const { playerDescriptions, agentDescriptions, worldMap } = checkpoint;
    if (playerDescriptions) {
      for (const description of playerDescriptions) {
        const existing = await ctx.db
          .query('playerDescriptions')
          .withIndex('worldId', (q) =>
            q.eq('worldId', worldId).eq('playerId', description.playerId),
          )
          .unique();
        if (existing) {
          await ctx.db.replace(existing._id, { worldId, ...description });
        } else {
          await ctx.db.insert('playerDescriptions', { worldId, ...description });
        }
      }
    }
    if (agentDescriptions) {
      for (const description of agentDescriptions) {
        const existing = await ctx.db
          .query('agentDescriptions')
          .withIndex('worldId', (q) => q.eq('worldId', worldId).eq('agentId', description.agentId))
          .unique();
        if (existing) {
          await ctx.db.replace(existing._id, { worldId, ...description });
        } else {
          await ctx.db.insert('agentDescriptions', { worldId, ...description });
        }
      }
    }
    if (worldMap) {
      const existing = await ctx.db
        .query('maps')
        .withIndex('worldId', (q) => q.eq('worldId', worldId))
        .unique();
      if (existing) {
        await ctx.db.replace(existing._id, { worldId, ...worldMap });
      } else {
        await ctx.db.insert('maps', { worldId, ...worldMap });
      }
    }
  }
}

export const loadWorld = internalQuery({
  args: {
    worldId: v.id('worlds'),
    generationNumber: v.number(),
  },
  handler: async (ctx, args) => {
    return await Game.load(ctx.db, args.worldId, args.generationNumber);
  },
});

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// Generation-mismatch and engine-stopped errors signal that this action has been
// superseded; they must not trigger retries or stop the (now newer) engine.
function isControlFlowError(e: unknown): boolean {
  return (
    e instanceof ConvexError &&
    (e.data?.kind === 'generationNumber' || e.data?.kind === 'engineNotRunning')
  );
}

export const saveWorldStep = internalMutation({
  args: {
    engineId: v.id('engines'),
    engineUpdate,
    worldId: v.id('worlds'),
    renderState: v.object(serializedRenderState),
    checkpoint: v.optional(v.object(serializedWorld)),
    playerDescriptions: v.optional(v.array(v.object(serializedPlayerDescription))),
    agentDescriptions: v.optional(v.array(v.object(serializedAgentDescription))),
    worldMap: v.optional(v.object(serializedWorldMap)),
    agentOperations: agentOperationsValidator,
  },
  handler: async (ctx, args) => {
    // Advance the engine and complete inputs every step (small, in-place writes).
    await applyEngineUpdate(ctx, args.engineId, args.engineUpdate);
    // Refresh the compact render snapshot every step.
    await upsertRenderState(ctx, args.renderState);
    // Only rewrite the authoritative world document on a real checkpoint.
    if (args.checkpoint) {
      await Game.saveCheckpoint(ctx, args.worldId, {
        world: args.checkpoint,
        playerDescriptions: args.playerDescriptions,
        agentDescriptions: args.agentDescriptions,
        worldMap: args.worldMap,
      });
    }
    for (const operation of args.agentOperations) {
      await runAgentOperation(ctx, operation.name, operation.args);
    }
  },
});

export const finishWorldAction = internalMutation({
  args: {
    engineId: v.id('engines'),
    expectedGenerationNumber: v.number(),
    worldId: v.id('worlds'),
    checkpoint: v.object(serializedWorld),
    playerDescriptions: v.optional(v.array(v.object(serializedPlayerDescription))),
    agentDescriptions: v.optional(v.array(v.object(serializedAgentDescription))),
    worldMap: v.optional(v.object(serializedWorldMap)),
  },
  handler: async (ctx, args) => {
    // Throws on generation mismatch / engine stopped so the caller won't schedule
    // another step over a superseded engine.
    await loadEngine(ctx.db, args.engineId, args.expectedGenerationNumber);
    await Game.saveCheckpoint(ctx, args.worldId, {
      world: args.checkpoint,
      playerDescriptions: args.playerDescriptions,
      agentDescriptions: args.agentDescriptions,
      worldMap: args.worldMap,
    });
  },
});

export const stopEngineForFailure = internalMutation({
  args: { engineId: v.id('engines') },
  handler: async (ctx, args) => {
    const engine = await ctx.db.get(args.engineId);
    if (engine && engine.running) {
      await ctx.db.patch(args.engineId, { running: false });
    }
  },
});
