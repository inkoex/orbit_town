# Convex Storage Migration & Verification Runbook

This runbook covers deploying the storage-stabilization changes and verifying that
a 6-agent + 1-user world keeps Convex **Database Storage** growth under **20MB per
hour** while movement, conversation, and memory keep working.

## Local-first development

The engine writes a compact render snapshot ~1s and a full checkpoint every 30s.
While iterating, prefer a local backend so you never fill a Free-plan cloud
deployment:

```bash
npx convex dev --local
npm run dev:frontend
```

For a long-running **cloud** dev deployment, enable the development usage guard
(auto-freeze after 60 minutes; manual resume starts a new window). Leave it unset
or `false` in production:

```bash
npx convex env set CONVEX_USAGE_GUARD true
```

## Migration order

The change is additive and backward compatible (`worlds.historicalLocations` is
kept optional so old documents still read). Deploy in this order:

1. **Export & capture baseline.** Export the existing deployment and record Convex
   Usage (Database Storage, Database I/O, Function Calls) with a UTC timestamp.
   ```bash
   npx convex export --path ./backup-before.zip
   ```
2. **Deploy schema + code.** Push the new schema (`worldRenderStates` table,
   `inputs.by_received` index, `worldStatus.runStartedAt`) and functions.
3. **Verify the first render snapshot** appears in `worldRenderStates` (exactly one
   document per world).
4. **Verify checkpoints drop `historicalLocations`.** After the first 30s
   checkpoint, new `worlds` documents must no longer contain `historicalLocations`
   (it now travels in the render snapshot).
5. **Verify preservation.** `messages`, `memories`, `memoryEmbeddings`, and the
   description tables are unchanged.
6. **Verify scheduled args.** `_scheduled_functions` entries for `agentDoSomething`
   must not contain the world map (`bgTiles`/`objectTiles`/`tileSetUrl`) or the
   `otherFreePlayers` list.

## Measuring per-table storage

Convex `export` writes one `<table>/documents.jsonl` per user table. Compare the
**uncompressed** bytes of each table before and after a run to attribute growth:

```bash
# After exporting and unzipping backup-before.zip / backup-after.zip:
for t in inputs worlds worldRenderStates messages memories memoryEmbeddings; do
  echo "$t: $(wc -c < "$t/documents.jsonl") bytes"
done
```

System tables such as `_scheduled_functions` are **not** included in `export`, so
sample them separately and record the row count and output size:

```bash
npx convex data _scheduled_functions --limit 1000
```

## 10-minute smoke verification

Run with 6 AI agents + 1 human player for 10 minutes. This is the gate for
starting the isometric vertical slice; it does not replace the final 60-minute
pre-release verification.

1. Reset/initialize the deployment and record the **initial** measurements above
   (per-table JSONL bytes + `_scheduled_functions` sample), with UTC timestamps.
2. Every ~2 minutes confirm user/AI movement and conversations + messages. Check
   memory creation and retrieval when the run produces a memory. Confirm the world
   stops within ~5 minutes of closing the browser.
3. Record the **final** measurements (same items) regardless of pass/fail, so the
   lever that actually reduced growth (`inputs` vacuum vs. scheduled-map removal vs.
   render/checkpoint split) can be attributed. Multiply each 10-minute storage
   delta by 6 and record the extrapolated hourly growth.

### Gate

All of the following must hold before starting the isometric vertical slice:

```text
Database Storage delta        <= 3.33MB / 10 minutes
extrapolated storage growth    <= 20MB / hour
regular checkpoint calls       <= 20 / 10 minutes
scheduled agent payload has map == false
movement / chat / memory regression == false
```

If any criterion fails, **do not** start the isometric work; record the per-table
deltas and per-function Database I/O in a "재측정 필요 / Needs re-measurement"
section below and investigate the dominant table first.

Before release, run the original 60-minute verification to validate long-period
behavior, the hourly extrapolation, `CONVEX_USAGE_GUARD` freezing at 60 minutes,
and that the 1-hour input vacuum runs without stalling agents — confirm movement
and conversations continue after the vacuum fires (this is the regression fixed
in this branch via the `engineInsertInput` input-number floor; the 10-minute
smoke gate cannot exercise it).

## Measured results

10-minute smoke verification — Task 9 (2026-06-23).

| Metric | Value | Gate | Result |
|--------|-------|------|--------|
| Measurement window | 10.41 min | — | — |
| Database Storage delta | 0.75 MB | ≤ 3.33 MB / 10 min | ✅ PASS |
| Extrapolated hourly growth | 4.32 MB/h | ≤ 20 MB/h | ✅ PASS |
| Scheduled agent payload contains map | 0 occurrences | == false | ✅ PASS |
| Max scheduled payload size | 1.2 KB | — | ✅ |
| Movement / chat / memory regression | none | == false | ✅ PASS |
| Jest | 88/88 | pass | ✅ |
| TypeScript | clean | pass | ✅ |

**Verdict: PASS** — storage growth is ~4.6× under the hourly target, so the
isometric vertical-slice gate is met. A full 60-minute pre-release verification
still remains before release (see below).

Caveat: the 10-minute window does not exercise the 1-hour input vacuum, so this
delta slightly over-estimates the steady-state rate (vacuum reclaims processed
`inputs` hourly). Over-estimating is the safe direction for a gate.
