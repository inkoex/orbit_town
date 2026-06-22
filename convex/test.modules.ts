/// <reference types="vite/client" />

// Shared module map for convex-test. The double-dot filename keeps Convex's
// bundler from treating this as a deployable function module (it would choke on
// `import.meta.glob`), while staying out of both Jest and Vitest test globs.
export const modules = import.meta.glob('./**/*.ts');
