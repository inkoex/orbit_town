import {
  normalizeCustomAgent,
  resolveAgentSpec,
  validateCustomAgent,
} from './createAgentValidation';

const base = { name: 'Zoe', character: 's1', identity: 'curious', plan: 'explore' };
const ctx = { existingNames: ['Nova'], agentCount: 1, validCharacters: ['s1', 's2'] };

describe('validateCustomAgent', () => {
  test('accepts valid args', () => {
    expect(() => validateCustomAgent(base, ctx)).not.toThrow();
  });

  test('rejects empty name', () => {
    expect(() => validateCustomAgent({ ...base, name: '' }, ctx)).toThrow(/name/i);
  });

  test('rejects too-long name', () => {
    expect(() => validateCustomAgent({ ...base, name: 'x'.repeat(33) }, ctx)).toThrow(/name/i);
  });

  test('rejects duplicate name case-insensitively', () => {
    expect(() => validateCustomAgent({ ...base, name: 'nova' }, ctx)).toThrow(/exists/i);
  });

  test('rejects unknown character', () => {
    expect(() => validateCustomAgent({ ...base, character: 'zzz' }, ctx)).toThrow(/character/i);
  });

  test('rejects when at max agents', () => {
    expect(() => validateCustomAgent(base, { ...ctx, agentCount: 8 })).toThrow(/max/i);
  });

  test('rejects too-long identity', () => {
    expect(() => validateCustomAgent({ ...base, identity: 'x'.repeat(1001) }, ctx)).toThrow(
      /identity/i,
    );
  });

  test('rejects whitespace-only identity', () => {
    expect(() => validateCustomAgent({ ...base, identity: '   ' }, ctx)).toThrow(/identity/i);
  });
});

describe('normalizeCustomAgent', () => {
  test('trims name, identity, and plan', () => {
    const out = normalizeCustomAgent({
      name: '  Zoe  ',
      character: 's1',
      identity: '  curious  ',
      plan: '  go  ',
    });
    expect(out).toEqual({ name: 'Zoe', character: 's1', identity: 'curious', plan: 'go' });
  });
});

describe('resolveAgentSpec', () => {
  const rctx = {
    descriptions: [
      { name: 'Nova', character: 's1', identity: 'curious', plan: 'explore' },
    ],
    existingNames: [] as string[],
    agentCount: 0,
    validCharacters: ['s1', 's2'],
  };

  test('rejects when both index and custom are present', () => {
    expect(() => resolveAgentSpec({ descriptionIndex: 0, custom: base }, rctx)).toThrow(
      /exactly one/i,
    );
  });

  test('rejects when neither index nor custom is present', () => {
    expect(() => resolveAgentSpec({}, rctx)).toThrow(/exactly one/i);
  });

  test('rejects out-of-range index', () => {
    expect(() => resolveAgentSpec({ descriptionIndex: 5 }, rctx)).toThrow(/descriptionIndex/i);
  });

  test('rejects non-integer index', () => {
    expect(() => resolveAgentSpec({ descriptionIndex: 1.5 }, rctx)).toThrow(/descriptionIndex/i);
  });

  test('resolves valid index to description', () => {
    expect(resolveAgentSpec({ descriptionIndex: 0 }, rctx)).toEqual(rctx.descriptions[0]);
  });

  test('resolves and normalizes valid custom args', () => {
    expect(resolveAgentSpec({ custom: { ...base, name: '  Zoe  ' } }, rctx)).toEqual({
      ...base,
      name: 'Zoe',
    });
  });

  test('custom path enforces validation', () => {
    expect(() =>
      resolveAgentSpec({ custom: { ...base, character: 'zzz' } }, rctx),
    ).toThrow(/character/i);
  });
});
