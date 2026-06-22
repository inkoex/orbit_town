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

## 60-minute verification

Run with 6 AI agents + 1 human player for 60 minutes.

1. Reset/initialize the deployment and record the **initial** measurements above
   (per-table JSONL bytes + `_scheduled_functions` sample), with UTC timestamps.
2. Every ~10 minutes confirm: user/AI movement, conversations + messages, memory
   creation and retrieval. Confirm the world stops within ~5 minutes of closing the
   browser, and that a manual resume starts a new 60-minute guard window.
3. Record the **final** measurements (same items) regardless of pass/fail, so the
   lever that actually reduced growth (`inputs` vacuum vs. scheduled-map removal vs.
   render/checkpoint split) can be attributed.

### Gate

All of the following must hold before starting the isometric vertical slice:

```text
Database Storage delta        <= 20MB / hour
regular checkpoint calls       <= 120 / hour
scheduled agent payload has map == false
movement / chat / memory regression == false
usage guard froze at 60 minutes == true
```

If any criterion fails, **do not** start the isometric work; record the per-table
deltas and per-function Database I/O in a "재측정 필요 / Needs re-measurement"
section below and investigate the dominant table first.

## Measured results

_(Filled in by the 60-minute verification run — Task 9.)_

