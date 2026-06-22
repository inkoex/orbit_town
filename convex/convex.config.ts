import { defineApp } from 'convex/server';
import { v } from 'convex/values';

// Typed app environment variables. CONVEX_USAGE_GUARD gates the development-only
// auto-freeze: set it to "true" on a long-running dev deployment, leave it unset
// (or "false") in production.
export default defineApp({
  env: {
    CONVEX_USAGE_GUARD: v.optional(v.string()),
  },
});
