import { describe, expect, test } from 'vitest';
import { usageGuardDecision } from './usageGuard';
import { USAGE_GUARD_LIMIT_MS } from '../constants';

describe('usageGuardDecision', () => {
  test('freezes once the limit is reached when enabled', () => {
    expect(
      usageGuardDecision({ enabled: true, now: USAGE_GUARD_LIMIT_MS, runStartedAt: 0 }),
    ).toBe('freeze');
  });

  test('does not freeze before the limit when enabled', () => {
    expect(
      usageGuardDecision({ enabled: true, now: USAGE_GUARD_LIMIT_MS - 1, runStartedAt: 0 }),
    ).toBe('continue');
  });

  test('never freezes when disabled, even past the limit', () => {
    expect(
      usageGuardDecision({ enabled: false, now: 2 * USAGE_GUARD_LIMIT_MS, runStartedAt: 0 }),
    ).toBe('continue');
  });

  test('does not freeze when the run start time is unknown', () => {
    expect(
      usageGuardDecision({ enabled: true, now: 10 * USAGE_GUARD_LIMIT_MS, runStartedAt: undefined }),
    ).toBe('continue');
  });
});
