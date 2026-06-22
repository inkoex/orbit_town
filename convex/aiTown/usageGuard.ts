import { USAGE_GUARD_LIMIT_MS } from '../constants';

// Pure policy for the development usage guard. Kept separate from any environment
// or database access so it is trivially unit-testable. A world is only frozen
// when the guard is enabled, the run start time is known, and the run has been
// going for at least USAGE_GUARD_LIMIT_MS.
export function usageGuardDecision(args: {
  enabled: boolean;
  now: number;
  runStartedAt?: number;
}): 'freeze' | 'continue' {
  if (!args.enabled) {
    return 'continue';
  }
  if (args.runStartedAt === undefined) {
    return 'continue';
  }
  return args.now - args.runStartedAt >= USAGE_GUARD_LIMIT_MS ? 'freeze' : 'continue';
}
