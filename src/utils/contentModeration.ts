import {
  checkPlantedStoryLocal,
  checkSupportiveReplyLocal,
  type ModerationCategory,
  type ModerationCheckResult,
} from './moderationRules';

export {
  checkPlantedStoryLocal,
  checkSupportiveReplyLocal,
  type ModerationCategory,
  type ModerationCheckResult,
};

/**
 * Full moderation check that runs deterministic local filtering FIRST
 * (English/Hindi/Hinglish/Devanagari profanity, obfuscations, direct PII),
 * then runs server-side Gemini AI moderation (/api/ai/moderate-content)
 * for deep personal-name detection (normal & obfuscated) and contextual abuse.
 * Fails closed if the safety check cannot complete so harmful content or names never slip through.
 */
export async function moderatePublicContent(params: {
  text: string;
  contentType: 'supportive_message' | 'story';
  storyContext?: string;
  contentWarning?: string;
}): Promise<ModerationCheckResult> {
  // Step 1: Fast local deterministic check on main text
  const localResult =
    params.contentType === 'supportive_message'
      ? checkSupportiveReplyLocal(params.text)
      : checkPlantedStoryLocal(params.text);

  if (!localResult.allowed) {
    return localResult;
  }

  // Also run local check on optional content warning if provided
  if (params.contentWarning && params.contentWarning.trim().length > 0) {
    const warningCheck = checkPlantedStoryLocal(params.contentWarning);
    if (!warningCheck.allowed) {
      return warningCheck;
    }
  }

  // Step 2: Server-side Gemini AI moderation (name detection, obfuscation, multilingual abuse)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch('/api/ai/moderate-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        text: params.text,
        contentType: params.contentType,
        storyContext: (params.storyContext || '').slice(0, 300),
        contentWarning: (params.contentWarning || '').slice(0, 120),
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      allowed?: boolean;
      category?: ModerationCategory;
      reason?: string;
      error?: string;
    };

    if (!res.ok) {
      return {
        allowed: false,
        category: data.category || 'moderation_unavailable',
        reason:
          data.reason ||
          data.error ||
          'Our safety guardian could not verify this post right now. Please wait a moment and try again.',
      };
    }

    if (data.allowed !== true) {
      return {
        allowed: false,
        category: data.category || 'unkind_tone',
        reason:
          data.reason ||
          'Our sanctuary guardian paused this post because it may contain a personal name, identifying info, or hurtful/abusive language. Please edit and try again.',
      };
    }

    return { allowed: true, category: 'clean' };
  } catch {
    return {
      allowed: false,
      category: 'moderation_unavailable',
      reason:
        'Our safety check timed out before finishing. Please tap again in a second to verify and plant your seed.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
