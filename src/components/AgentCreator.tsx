import { useState } from 'react';
import { Id } from '../../convex/_generated/dataModel';
import { useSendInput } from '../hooks/sendInput';
import { characters, creatableCharacters } from '../../data/characters';
import { themeFromTileSetUrl } from '../../convex/util/theme';
import { ServerGame } from '../hooks/serverGame';

function AvatarPreview({ characterName, scale = 2 }: { characterName: string; scale?: number }) {
  const character = characters.find((candidate) => candidate.name === characterName);
  if (!character) return null;
  const first = Object.values(character.spritesheetData.frames)[0]?.frame;
  if (!first) return null;
  return (
    <div style={{ width: first.w * scale, height: first.h * scale, overflow: 'hidden' }}>
      <div
        style={{
          width: first.w,
          height: first.h,
          backgroundImage: `url(${character.textureUrl})`,
          backgroundPosition: `-${first.x}px -${first.y}px`,
          backgroundRepeat: 'no-repeat',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}

export function AgentCreator({ engineId, game }: { engineId: Id<'engines'>; game: ServerGame }) {
  const pickable = creatableCharacters(themeFromTileSetUrl(game.worldMap.tileSetUrl));
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [character, setCharacter] = useState(pickable[0]?.name ?? '');
  const [identity, setIdentity] = useState('');
  const [plan, setPlan] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const createAgent = useSendInput(engineId, 'createAgent');

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await createAgent({ custom: { name: name.trim(), character, identity, plan } });
      setOpen(false);
      setName('');
      setIdentity('');
      setPlan('');
    } catch (error: any) {
      setError(error.message ?? 'Failed to create agent');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4">
      <button
        type="button"
        className="button text-white shadow-solid px-3 py-1"
        onClick={() => setOpen(true)}
      >
        + 에이전트 만들기
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-brown-800 text-brown-100 p-6 rounded w-96 max-w-[90vw]">
            <h2 className="text-lg mb-3">새 에이전트</h2>
            <label className="block text-sm mb-1">아바타</label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {pickable.map((candidate) => (
                <button
                  type="button"
                  key={candidate.name}
                  onClick={() => setCharacter(candidate.name)}
                  className={`border-2 p-1 flex items-center justify-center ${
                    character === candidate.name ? 'border-yellow-400' : 'border-transparent'
                  }`}
                >
                  <AvatarPreview characterName={candidate.name} />
                </button>
              ))}
            </div>
            <input
              className="w-full mb-2 text-black px-2 py-1"
              placeholder="이름"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <textarea
              className="w-full mb-2 text-black px-2 py-1"
              placeholder="성격 (identity)"
              value={identity}
              onChange={(event) => setIdentity(event.target.value)}
            />
            <textarea
              className="w-full mb-2 text-black px-2 py-1"
              placeholder="계획 (plan)"
              value={plan}
              onChange={(event) => setPlan(event.target.value)}
            />
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="button px-3 py-1"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                취소
              </button>
              <button
                type="button"
                className="button px-3 py-1"
                onClick={submit}
                disabled={busy || !name.trim() || !identity.trim()}
              >
                {busy ? '생성 중...' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
