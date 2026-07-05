import { v } from 'convex/values';

// ============================================================================
// The NEUTRAL WORK-EVENT CONTRACT — the seam between the work layer (agents
// doing real work in ANY orchestrator: Claude Code hooks, Paperclip, CrewAI,
// a fake generator…) and the presentation layer (Orbit Station).
//
// Rules that make it a contract:
// - Sources TRANSLATE their native events into THIS vocabulary before pushing.
// - The UI reads ONLY these fields. It must never depend on `raw` (debug-only).
// - The vocabulary is minimal + semantic; no tool-specific terms.
// Decision record: docs/design/2026-07-03-paperclip-integration.md §3.4.
// ============================================================================

// Pure validators only (no function definitions) so convex/schema.ts can
// import this module safely, mirroring the aiTown/ids.ts pattern.

export const workEventType = v.union(
  v.literal('run_started'),
  v.literal('task_assigned'),
  v.literal('agent_message'),
  v.literal('tool_call_started'),
  v.literal('tool_call_finished'),
  v.literal('decision_recorded'),
  v.literal('artifact_created'),
  v.literal('status_changed'),
  v.literal('run_finished'),
);

// The envelope every source must fill. `summary` is the human-readable line the
// presentation shows verbatim — sources phrase it; the UI never digs into
// payload/raw to render a caption.
export const workEventFields = {
  source: v.string(), // adapter id: "fake" | "claude-code" | "paperclip" | …
  type: workEventType,
  agentName: v.optional(v.string()), // which avatar this concerns (e.g. "Nova")
  summary: v.string(), // one display-ready line, phrased by the source
  payload: v.optional(v.any()), // type-specific details (artifact id, tool name…)
  externalId: v.optional(v.string()), // source's id for this event → idempotent ingest
  externalRunId: v.optional(v.string()), // groups events of one run/job
  sourceTimestamp: v.optional(v.number()), // ms epoch at the source (ingest time = _creationTime)
  raw: v.optional(v.any()), // source-native event, DEBUG ONLY — UI must not read
};
