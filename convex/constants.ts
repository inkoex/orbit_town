export const ACTION_TIMEOUT = 120_000; // more time for local dev
// export const ACTION_TIMEOUT = 60_000;// normally fine

export const IDLE_WORLD_TIMEOUT = 5 * 60 * 1000;
export const WORLD_HEARTBEAT_INTERVAL = 60 * 1000;

export const MAX_STEP = 10 * 60 * 1000;
export const TICK = 16;
export const STEP_INTERVAL = 1000;

export const PATHFINDING_TIMEOUT = 60 * 1000;
export const PATHFINDING_BACKOFF = 1000;
export const CONVERSATION_DISTANCE = 1.3;
export const MIDPOINT_THRESHOLD = 4;
export const TYPING_TIMEOUT = 15 * 1000;
export const COLLISION_THRESHOLD = 0.75;

// How many human players can be in a world at once.
export const MAX_HUMAN_PLAYERS = 8;

// Don't talk to anyone for 3 min after having a conversation.
export const CONVERSATION_COOLDOWN = 180000;

// Don't do another activity for 10s after doing one.
export const ACTIVITY_COOLDOWN = 10_000;

// Don't talk to a player within 3 min of talking to them.
export const PLAYER_CONVERSATION_COOLDOWN = 180000;

// Accept 60% of invites that come from other agents.
export const INVITE_ACCEPT_PROBABILITY = 0.6;

// Wait for 1m for invites to be accepted.
export const INVITE_TIMEOUT = 60000;

// Wait for another player to say something before jumping in.
export const AWKWARD_CONVERSATION_TIMEOUT = 60_000; // more time locally
// export const AWKWARD_CONVERSATION_TIMEOUT = 20_000;

// Leave a conversation after participating too long.
export const MAX_CONVERSATION_DURATION = 10 * 60_000; // more time locally
// export const MAX_CONVERSATION_DURATION = 2 * 60_000;

// Leave a conversation if it has more than 6 messages;
export const MAX_CONVERSATION_MESSAGES = 6;

// Wait for 1s after sending an input to the engine. We can remove this
// once we can await on an input being processed.
export const INPUT_DELAY = 1000;

// How many memories to get from the agent's memory.
// This is over-fetched by 10x so we can prioritize memories by more than relevance.
export const NUM_MEMORIES_TO_SEARCH = 3;

// Wait for at least 6 seconds before sending another message.
export const MESSAGE_COOLDOWN = 6000;

// Don't run a turn of the agent more than once a second.
export const AGENT_WAKEUP_THRESHOLD = 1000;

// How old we let memories be before we vacuum them
export const VACUUM_MAX_AGE = 2 * 7 * 24 * 60 * 60 * 1000;
export const DELETE_BATCH_SIZE = 64;

export const HUMAN_IDLE_TOO_LONG = 5 * 60 * 1000;

export const ACTIVITIES = [
  { description: 'reading a book', emoji: '📖', duration: 60_000 },
  { description: 'daydreaming', emoji: '🤔', duration: 60_000 },
  { description: 'gardening', emoji: '🥕', duration: 60_000 },
];

export const ENGINE_ACTION_DURATION = 30000;

// Bound the number of pathfinding searches we do per game step.
export const MAX_PATHFINDS_PER_STEP = 16;

export const DEFAULT_NAME = 'Me';

export const MAX_AGENTS = 8;
export const AGENT_NAME_MAX = 32;
export const AGENT_IDENTITY_MAX = 1000;
export const AGENT_PLAN_MAX = 500;

// Convex persistence stabilization.
// How often the full authoritative `worlds` checkpoint is saved.
export const CHECKPOINT_INTERVAL_MS = 30_000;
// How long processed engine inputs are retained before being vacuumed.
export const INPUT_RETENTION_MS = 60 * 60 * 1000;
// How long a development world may run before the usage guard freezes it.
// 5 minutes while the July DB I/O quota is blown: unfreeze = a short viewing
// window, then the guard cuts the engine even if an open tab keeps it "viewed".
export const USAGE_GUARD_LIMIT_MS = 5 * 60 * 1000;
