import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { SpeechBubble } from './SpeechBubble';
import { BUBBLE_FRESH_MS, pickLatestAuthoredMessage, truncateBubbleText } from './bubble';

// Data shim for a participating player's live bubble. Mounted ONLY while the
// player is `participating` in a conversation, so the useQuery subscription
// appears/disappears with the conversation (and Convex dedupes the two
// participants' identical subscriptions — one query serves both bubbles).
// Conversations cap at 6 messages, so the payload is tiny.
interface Props {
  worldId: Id<'worlds'>;
  conversationId: string;
  playerId: string;
  name?: string;
  now: number;
}

export function ConversationBubble({ worldId, conversationId, playerId, name, now }: Props) {
  const messages = useQuery(api.messages.listMessages, { worldId, conversationId });
  if (!messages) return null;
  const latest = pickLatestAuthoredMessage(messages, playerId);
  if (!latest) return null;
  const age = now - latest._creationTime;
  if (age >= BUBBLE_FRESH_MS) return null;
  return (
    // Keyed by messageUuid: each new message remounts the bubble, resetting its
    // fade clock; ageAtMountMs covers joining mid-lifetime (e.g. page reload).
    <SpeechBubble
      key={latest.messageUuid}
      headerName={name}
      text={truncateBubbleText(latest.text)}
      ageAtMountMs={Math.max(0, age)}
      fade
    />
  );
}
