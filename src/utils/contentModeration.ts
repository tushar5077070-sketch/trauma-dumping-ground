export interface ModerationCheckResult {
  allowed: boolean;
  reason?: string;
  category?:
    | 'clean'
    | 'insult_or_belittling'
    | 'dismissive_or_mocking'
    | 'self_harm_or_threat'
    | 'profanity_or_slur'
    | 'harassment'
    | 'unkind_tone';
}

// Words that are NEVER acceptable in a supportive reply ("Leave a kind message")
const SUPPORTIVE_REPLY_BLOCKED_WORDS = new Set([
  'pathetic',
  'loser',
  'losers',
  'weak',
  'weakling',
  'stupid',
  'idiot',
  'idiotic',
  'moron',
  'dumb',
  'dumbass',
  'fool',
  'foolish',
  'clown',
  'worthless',
  'useless',
  'trash',
  'garbage',
  'filth',
  'scum',
  'scumbag',
  'disgusting',
  'gross',
  'ugly',
  'freak',
  'weirdo',
  'psycho',
  'crazy',
  'insane',
  'delusional',
  'deranged',
  'retard',
  'retarded',
  'lame',
  'cringe',
  'cringey',
  'cringy',
  'corny',
  'dramatic',
  'overdramatic',
  'overreacting',
  'crybaby',
  'whiner',
  'whining',
  'whiny',
  'fake',
  'faker',
  'liar',
  'lying',
  'fraud',
  'hypocrite',
  'coward',
  'cowardly',
  'selfish',
  'narcissist',
  'brat',
  'spoiled',
  'annoying',
  'boring',
  'ridiculous',
  'laughable',
  'pitiful',
  'shameful',
  'embarrassing',
  'embarrassment',
  'disgrace',
  'failure',
  'reject',
  'parasite',
  'Deserved',
  'deserved',
  'kys',
  'stfu',
  'gtfo',
  'fuck',
  'fucking',
  'fucker',
  'fucked',
  'motherfucker',
  'shit',
  'shitty',
  'bullshit',
  'bitch',
  'bitches',
  'asshole',
  'bastard',
  'dick',
  'dickhead',
  'pussy',
  'cunt',
  'slut',
  'whore',
  'twat',
  'prick',
  'douche',
  'douchebag',
  'jackass',
  'wimp',
  'sissy',
  'snowflake',
  'boohoo',
  'lmao',
  'lmfao',
  'rofl',
  'lol',
  'haha',
  'hahaha',
]);

// Phrases that are hostile, dismissive, mocking, or harmful in supportive replies
const SUPPORTIVE_REPLY_BLOCKED_PHRASES: Array<{
  pattern: RegExp;
  category: ModerationCheckResult['category'];
  reason: string;
}> = [
  {
    pattern:
      /\b(kill\s*your\s*self|k\s*y\s*s|end\s*your\s*life|go\s*die|hope\s*you\s*die|drop\s*dead|better\s*off\s*dead|hurt\s*your\s*self|cut\s*your\s*self|jump\s*off)\b/i,
    category: 'self_harm_or_threat',
    reason:
      'This message contains harmful or threatening language and cannot be sent.',
  },
  {
    pattern:
      /\b(pathetic|worthless|useless|loser|crybaby|weakling|idiot|moron|stupid|dumbass|scumbag|trash|garbage|clown|freak|weirdo|psycho|delusional|retarded|cringe|cringey|pitiful|disgrace|waste\s+of\s+(space|air|oxygen|life))\b/i,
    category: 'insult_or_belittling',
    reason:
      'Unsaid is a compassionate sanctuary. Insulting or belittling words (such as calling someone pathetic or weak) are blocked to protect vulnerable authors.',
  },
  {
    pattern:
      /\b(nobody\s+cares|no\s+one\s+cares|who\s+cares|don'?t\s+care|i\s+don'?t\s+care|shut\s+up|grow\s+up|man\s+up|get\s+over\s+it|stop\s+crying|stop\s+whining|stop\s+complaining|cry\s+more|keep\s+crying|boo\s*hoo|womp\s*womp|skill\s+issue|suck\s+it\s+up|deal\s+with\s+it|attention\s+seeker|seeking\s+attention|for\s+attention|pick\s+me|overreacting|being\s+dramatic|so\s+dramatic)\b/i,
    category: 'dismissive_or_mocking',
    reason:
      'Dismissive or mocking remarks are not allowed here. Please share only gentle, supportive words.',
  },
  {
    pattern:
      /\b(you\s+deserve\s+(it|this|that)|you\s+deserved\s+(it|this|that)|your\s+own\s+fault|all\s+your\s+fault|blame\s+yourself|i\s+hate\s+you|everyone\s+hates\s+you|nobody\s+likes\s+you|no\s+one\s+likes\s+you|you\s+suck|screw\s+you|fuck\s+you|shame\s+on\s+you)\b/i,
    category: 'harassment',
    reason:
      'Hostile or blaming messages are blocked. Please offer kindness or step back quietly.',
  },
  {
    pattern:
      /\b(fuck|fucking|motherfucker|bitch|asshole|bastard|cunt|slut|whore|faggot|nigger|nigga|retard)\b/i,
    category: 'profanity_or_slur',
    reason:
      'Profanity and slurs are not permitted in kind messages.',
  },
];

// Normalize obfuscated text (e.g., "p.a.t.h.e.t.i.c", "p@thetic", "paaaathetic")
function normalizeForScan(raw: string): {
  lower: string;
  collapsed: string;
  alphaWords: string[];
} {
  const lower = raw
    .toLowerCase()
    .replace(/@/g, 'a')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/\$/g, 's')
    .replace(/!/g, 'i');

  // Collapse repeated letters (>2 in a row -> 1, e.g., "paaaathetic" -> "pathetic")
  const deRepeated = lower.replace(/([a-z])\1{2,}/g, '$1');

  // Collapse spaced-out single letters like "p a t h e t i c" or "p.a.t.h.e.t.i.c"
  const collapsed = deRepeated.replace(/[^a-z0-9]+/g, '');

  const alphaWords = deRepeated
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  return { lower: deRepeated, collapsed, alphaWords };
}

/**
 * Deterministic synchronous check for supportive replies ("Leave a kind message").
 * Catches insults like "pathetic", profanity, dismissiveness, and obfuscated variants immediately.
 */
export function checkSupportiveReplyLocal(text: string): ModerationCheckResult {
  const trimmed = (text || '').trim();
  if (trimmed.length < 2) {
    return {
      allowed: false,
      category: 'unkind_tone',
      reason: 'Please write a kind message of at least a few words.',
    };
  }

  const { lower, collapsed, alphaWords } = normalizeForScan(trimmed);

  // 1. Phrase pattern check on original & normalized text
  for (const rule of SUPPORTIVE_REPLY_BLOCKED_PHRASES) {
    if (rule.pattern.test(trimmed) || rule.pattern.test(lower)) {
      return {
        allowed: false,
        category: rule.category,
        reason: rule.reason,
      };
    }
  }

  // 2. Token-level check against blocked insult/hostile words
  for (const word of alphaWords) {
    const stripped = word.replace(/^'+|'+$/g, '');
    if (SUPPORTIVE_REPLY_BLOCKED_WORDS.has(stripped)) {
      return {
        allowed: false,
        category: 'insult_or_belittling',
        reason:
          'Unsaid only allows gentle, supportive replies. Hurtful or judgmental words (like "' +
          stripped +
          '") cannot be sent.',
      };
    }
  }

  // 3. Obfuscated single-word or short-message check (e.g. "p.a.t.h.e.t.i.c", "l-o-s-e-r", "k.y.s")
  const highRiskStems = [
    'pathetic',
    'worthless',
    'useless',
    'crybaby',
    'kys',
    'killurself',
    'killyourself',
    'stfu',
    'fuckyou',
    'asshole',
    'bitch',
    'retard',
    'cringe',
    'loser',
    'whore',
    'slut',
    'faggot',
    'nigger',
  ];
  for (const stem of highRiskStems) {
    if (
      collapsed === stem ||
      (collapsed.length <= 24 && collapsed.includes(stem))
    ) {
      return {
        allowed: false,
        category: 'insult_or_belittling',
        reason:
          'Unsaid is a safe space for emotional healing. Hurtful or insulting messages are blocked.',
      };
    }
  }

  return { allowed: true, category: 'clean' };
}

/**
 * Deterministic synchronous check for main stories planted in the meadow.
 * Allows honest personal vulnerability/sadness while blocking targeted hate speech, slurs, or self-harm encouragement.
 */
export function checkPlantedStoryLocal(text: string): ModerationCheckResult {
  const trimmed = (text || '').trim();
  const { lower } = normalizeForScan(trimmed);

  if (
    /\b(kill\s*your\s*self|k\s*y\s*s|you\s+should\s+die|go\s+die|faggot|nigger|nigga|kike|chink|spic)\b/i.test(
      lower
    )
  ) {
    return {
      allowed: false,
      category: 'harassment',
      reason:
        'Content containing hate speech, slurs, or encouragement of harm cannot be planted in the garden.',
    };
  }

  return { allowed: true, category: 'clean' };
}

/**
 * Full moderation check that runs deterministic local filtering FIRST,
 * then calls the server-side Gemini AI moderation endpoint (/api/ai/moderate-content).
 */
export async function moderatePublicContent(params: {
  text: string;
  contentType: 'supportive_message' | 'story';
  storyContext?: string;
}): Promise<ModerationCheckResult> {
  // Step 1: Fast local deterministic check
  const localResult =
    params.contentType === 'supportive_message'
      ? checkSupportiveReplyLocal(params.text)
      : checkPlantedStoryLocal(params.text);

  if (!localResult.allowed) {
    return localResult;
  }

  // Step 2: Server-side Gemini AI moderation check
  try {
    const res = await fetch('/api/ai/moderate-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: params.text,
        contentType: params.contentType,
        storyContext: (params.storyContext || '').slice(0, 600),
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        allowed?: boolean;
        category?: ModerationCheckResult['category'];
        reason?: string;
      };
      if (data.allowed === false) {
        return {
          allowed: false,
          category: data.category || 'unkind_tone',
          reason:
            data.reason ||
            'Our sanctuary guardian paused this message because it may sound hurtful or unsupportive. Please rephrase with warmth and kindness.',
        };
      }
    }
  } catch {
    // If network/offline error occurs, local deterministic check has already enforced safety
  }

  return { allowed: true, category: 'clean' };
}
