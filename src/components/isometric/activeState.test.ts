import { deriveActiveState, debugActiveState } from './activeState';

describe('deriveActiveState', () => {
  const idle = { isSpeaking: false, isThinking: false, isMoving: false, hasLiveActivity: false };

  test('all signals false => idle', () => {
    expect(deriveActiveState(idle)).toBe('idle');
  });

  test('any single signal true => active', () => {
    expect(deriveActiveState({ ...idle, isSpeaking: true })).toBe('active');
    expect(deriveActiveState({ ...idle, isThinking: true })).toBe('active');
    expect(deriveActiveState({ ...idle, isMoving: true })).toBe('active');
    expect(deriveActiveState({ ...idle, hasLiveActivity: true })).toBe('active');
  });
});

describe('debugActiveState', () => {
  test('is deterministic for a given id', () => {
    expect(debugActiveState('player-a')).toBe(debugActiveState('player-a'));
    expect(debugActiveState('player-b')).toBe(debugActiveState('player-b'));
  });

  test('produces both states across a set of ids (visible contrast)', () => {
    const ids = ['p:0', 'p:1', 'p:2', 'p:3', 'p:4', 'p:5', 'p:6', 'p:7'];
    const states = new Set(ids.map(debugActiveState));
    expect(states.has('active')).toBe(true);
    expect(states.has('idle')).toBe(true);
  });
});
