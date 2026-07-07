#!/usr/bin/env node
// Fake workEvents generator — replays the M002 script into the deployment's
// workEvents table so the billboard ticker shows "a company's day" without any
// real engine. Spec: docs/superpowers/specs/2026-07-07-fake-workevents-generator-design.md
//
// Usage:
//   node scripts/workevents/replay.mjs          # reset → replay → rest → repeat
//   node scripts/workevents/replay.mjs --once   # single replay, then exit
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConvexHttpClient } from 'convex/browser';
import { anyApi } from 'convex/server';

const here = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(readFileSync(join(here, 'm002.json'), 'utf8'));

function deploymentUrl() {
  if (process.env.VITE_CONVEX_URL) return process.env.VITE_CONVEX_URL;
  const envFile = readFileSync(join(here, '../../.env.local'), 'utf8');
  const line = envFile
    .split('\n')
    .find((l) => l.startsWith('VITE_CONVEX_URL='));
  if (!line) throw new Error('VITE_CONVEX_URL not found (env var or .env.local)');
  return line.slice('VITE_CONVEX_URL='.length).trim();
}

const client = new ConvexHttpClient(deploymentUrl());
const sleep = (s) => new Promise((resolve) => setTimeout(resolve, s * 1000));

async function pushWithRetry(args) {
  try {
    return await client.mutation(anyApi.workEvents.push, args);
  } catch (err) {
    console.warn(`  push failed (${err?.message ?? err}), retrying once…`);
    try {
      return await client.mutation(anyApi.workEvents.push, args);
    } catch (err2) {
      console.error(`  push failed again, skipping line: ${err2?.message ?? err2}`);
      return null;
    }
  }
}

async function replayOnce(round) {
  const { deleted } = await client.mutation(anyApi.workEvents.clearSource, {
    source: doc.source,
  });
  console.log(`round ${round}: cleared ${deleted} old '${doc.source}' events`);
  for (const [i, entry] of doc.script.entries()) {
    await sleep(entry.delay);
    const res = await pushWithRetry({
      source: doc.source,
      type: entry.type,
      ...(entry.agentName !== undefined ? { agentName: entry.agentName } : {}),
      summary: entry.summary,
      ...(entry.payload !== undefined ? { payload: entry.payload } : {}),
      externalId: `${doc.runPrefix}-r${round}-s${i + 1}`,
      externalRunId: `${doc.runPrefix}-r${round}`,
      sourceTimestamp: Date.now(),
    });
    if (res) {
      const dedup = res.deduped ? ' (deduped)' : '';
      console.log(
        `  [${i + 1}/${doc.script.length}] ${entry.agentName ?? 'SYS'} · ${entry.summary}${dedup}`,
      );
    }
  }
}

const once = process.argv.includes('--once');
let round = 1;
for (;;) {
  await replayOnce(round);
  if (once) break;
  console.log(`round ${round} done — resting ${doc.restSeconds}s (Ctrl+C to stop)`);
  await sleep(doc.restSeconds);
  round += 1;
}
console.log('done.');
