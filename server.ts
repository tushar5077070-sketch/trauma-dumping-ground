import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function handleGeminiRouteError(
  res: Response,
  err: unknown,
  fallbackMessage: string
) {
  const message = err instanceof Error ? err.message : String(err);
  const statusMatch = message.match(/\b(400|401|403|404|429|500|503)\b/);
  const statusCode = statusMatch ? Number(statusMatch[1]) : 500;

  if (
    message.includes('API_KEY_INVALID') ||
    message.includes('PERMISSION_DENIED') ||
    statusCode === 403
  ) {
    return res.status(403).json({
      code: 'GEMINI_AUTH_ERROR',
      error:
        'Gemini API access was rejected. Please verify GEMINI_API_KEY in Settings > Secrets.',
    });
  }

  if (message.includes('RESOURCE_EXHAUSTED') || statusCode === 429) {
    return res.status(429).json({
      code: 'GEMINI_QUOTA_ERROR',
      error:
        'Gemini API rate limit or quota reached. Please wait a moment and try again.',
    });
  }

  return res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
    code: 'GEMINI_ERROR',
    error: message || fallbackMessage,
  });
}

function requireConsentAndClient(
  req: Request,
  res: Response
): GoogleGenAI | null {
  const body = req.body as { aiConsent?: unknown } | undefined;
  if (!body || body.aiConsent !== true) {
    res.status(400).json({
      code: 'CONSENT_REQUIRED',
      error:
        'Explicit user AI consent is required before sending private journal data to Gemini.',
    });
    return null;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      code: 'MISSING_GEMINI_API_KEY',
      error:
        'Server-side GEMINI_API_KEY is not configured. Add GEMINI_API_KEY in Settings > Secrets to enable AI transcription and reflections.',
    });
    return null;
  }

  return ai;
}

const SAFETY_NON_CLINICAL_BOUNDARY = `
Strict safety and tone boundaries:
- Be warm, empathetic, gentle, conversational, and non-judgmental.
- NEVER diagnose any mental-health, psychiatric, or medical condition.
- NEVER use clinical labels, disorder names, or claim psychological certainty.
- Present all emotional observations as approximate, tentative interpretations of written/spoken words.
- Do not fabricate facts or experiences that are not present in the user's own words.
`.trim();

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Health & capability status check (never leaks secrets)
  app.get('/api/ai/status', (_req: Request, res: Response) => {
    const ai = getGeminiClient();
    res.json({
      configured: Boolean(ai),
      models: {
        transcription: 'gemini-3.5-transcribe',
        analysis: 'gemini-4-hydrogen',
      },
      trainingOptOutNote:
        'Journal entries are processed statelessly per request only when you grant explicit consent.',
    });
  });

  // 1. Speech Transcription (gemini-3.5-transcribe)
  app.post('/api/ai/transcribe', async (req: Request, res: Response) => {
    const ai = requireConsentAndClient(req, res);
    if (!ai) return;

    const { audioBase64, mimeType } = req.body as {
      audioBase64?: string;
      mimeType?: string;
    };

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({
        code: 'INVALID_AUDIO',
        error: 'Audio recording data is required for transcription.',
      });
    }

    const cleanBase64 = audioBase64.includes(',')
      ? audioBase64.split(',')[1]?.trim() || ''
      : audioBase64.trim();

    if (cleanBase64.length < 32) {
      return res.status(400).json({
        code: 'EMPTY_AUDIO',
        error:
          'Recorded audio was empty or too short to transcribe. Please record a little longer.',
      });
    }

    const cleanMime =
      typeof mimeType === 'string' && mimeType.startsWith('audio/')
        ? mimeType.split(';')[0].trim()
        : 'audio/webm';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: cleanBase64,
              },
            },
            {
              text: 'Transcribe this personal voice journal audio accurately and verbatim with natural punctuation. If there is only silence or no intelligible speech, respond with an empty string.',
            },
          ],
        },
      });

      const transcript = (response.text ?? '').trim();
      return res.json({ transcript });
    } catch (err) {
      return handleGeminiRouteError(
        res,
        err,
        'Unable to transcribe audio right now.'
      );
    }
  });

  // 2. Emotion Classification (gemini-4-hydrogen)
  app.post('/api/ai/classify-emotion', async (req: Request, res: Response) => {
    const ai = requireConsentAndClient(req, res);
    if (!ai) return;

    const { text } = req.body as { text?: string };
    const cleanText = typeof text === 'string' ? text.trim().slice(0, 8000) : '';
    if (cleanText.length < 5) {
      return res.status(400).json({
        code: 'TEXT_TOO_SHORT',
        error: 'Please provide at least a few words to interpret emotional tone.',
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Interpret the approximate emotional tones expressed in this private journal text:\n\n"""\n${cleanText}\n"""`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction: `${SAFETY_NON_CLINICAL_BOUNDARY}
Classify 1 to 4 everyday emotional tones (choose gentle plain-language labels such as: Reflective, Hopeful, Heavy-hearted, Tender, Grateful, Overwhelmed, Peaceful, Unsettled, Relieved, Weary, Calm, Lonely, Courageous). Give each an approximate intensity from 1 to 100 and a single brief tentative note explaining why the wording sounded that way.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              primaryEmotion: { type: Type.STRING },
              emotions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    intensity: { type: Type.INTEGER },
                  },
                },
              },
              interpretationNote: { type: Type.STRING },
            },
            required: ['primaryEmotion', 'emotions', 'interpretationNote'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        primaryEmotion?: string;
        emotions?: Array<{ label?: string; intensity?: number }>;
        interpretationNote?: string;
      };

      const emotions = Array.isArray(parsed.emotions)
        ? parsed.emotions
            .slice(0, 6)
            .map((e) => ({
              label: String(e.label || 'Reflective').slice(0, 40),
              intensity: Math.max(
                1,
                Math.min(100, Math.round(Number(e.intensity || 50)))
              ),
            }))
        : [];

      return res.json({
        primaryEmotion: String(
          parsed.primaryEmotion || emotions[0]?.label || 'Reflective'
        ).slice(0, 50),
        emotions,
        interpretationNote: String(
          parsed.interpretationNote ||
            'Approximate emotional tone derived gently from your own words.'
        ).slice(0, 300),
        disclaimer:
          'Approximate interpretation of text only — not a clinical assessment or diagnosis.',
      });
    } catch (err) {
      return handleGeminiRouteError(
        res,
        err,
        'Unable to classify emotions right now.'
      );
    }
  });

  // 3. Journal Summarisation (gemini-4-hydrogen)
  app.post('/api/ai/summarize-journal', async (req: Request, res: Response) => {
    const ai = requireConsentAndClient(req, res);
    if (!ai) return;

    const { text, title, entryDate } = req.body as {
      text?: string;
      title?: string;
      entryDate?: string;
    };
    const cleanText = typeof text === 'string' ? text.trim().slice(0, 8000) : '';
    if (cleanText.length < 8) {
      return res.status(400).json({
        code: 'TEXT_TOO_SHORT',
        error: 'Journal text is too short to summarise meaningfully.',
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Date: ${entryDate || 'Unspecified'}\nExisting title: ${title || 'None'}\nEntry:\n"""\n${cleanText}\n"""`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction: `${SAFETY_NON_CLINICAL_BOUNDARY}
Write a gentle, concise 1 to 2 sentence summary capturing the essence of this private entry in second person or neutral warm voice, plus a short calm suggested title (2 to 6 words).`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              suggestedTitle: { type: Type.STRING },
            },
            required: ['summary', 'suggestedTitle'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        summary?: string;
        suggestedTitle?: string;
      };

      return res.json({
        summary: String(parsed.summary || '').trim().slice(0, 1000),
        suggestedTitle: String(parsed.suggestedTitle || '')
          .trim()
          .slice(0, 120),
      });
    } catch (err) {
      return handleGeminiRouteError(
        res,
        err,
        'Unable to summarise this journal entry right now.'
      );
    }
  });

  // 4. Recurring Theme Extraction (gemini-4-hydrogen)
  app.post('/api/ai/extract-themes', async (req: Request, res: Response) => {
    const ai = requireConsentAndClient(req, res);
    if (!ai) return;

    const { entries } = req.body as {
      entries?: Array<{ id?: string; date?: string; text?: string }>;
    };

    const validEntries = Array.isArray(entries)
      ? entries
          .filter((e) => typeof e?.text === 'string' && e.text.trim().length >= 5)
          .slice(0, 60)
          .map((e) => ({
            id: String(e.id || '').slice(0, 64),
            date: String(e.date || '').slice(0, 40),
            text: String(e.text || '').trim().slice(0, 1500),
          }))
      : [];

    if (validEntries.length === 0) {
      return res.status(400).json({
        code: 'INSUFFICIENT_DATA',
        error:
          'At least one opted-in journal entry with written/transcribed text is needed to identify themes.',
      });
    }

    try {
      const serialized = validEntries
        .map((e) => `[id=${e.id} date=${e.date}] ${e.text}`)
        .join('\n\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Identify recurring personal life themes across these opted-in journal entries:\n\n${serialized}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          systemInstruction: `${SAFETY_NON_CLINICAL_BOUNDARY}
Extract 2 to 6 recurring everyday themes grounded strictly in the provided entries (for example: "Setting boundaries", "Rest & energy", "Family memories", "Quiet gratitude", "Navigating change"). Include accurate entryIds from the input list where each theme appears.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              themes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    theme: { type: Type.STRING },
                    description: { type: Type.STRING },
                    frequency: { type: Type.INTEGER },
                    entryIds: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ['theme', 'description', 'frequency', 'entryIds'],
                },
              },
            },
            required: ['themes'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        themes?: Array<{
          theme?: string;
          description?: string;
          frequency?: number;
          entryIds?: string[];
        }>;
      };

      const validIdSet = new Set(validEntries.map((e) => e.id));
      const themes = Array.isArray(parsed.themes)
        ? parsed.themes.slice(0, 6).map((t) => {
            const matchedIds = Array.isArray(t.entryIds)
              ? t.entryIds.filter((id) => validIdSet.has(id))
              : [];
            return {
              theme: String(t.theme || 'Quiet Reflection').slice(0, 60),
              description: String(t.description || '').slice(0, 220),
              frequency: Math.max(
                1,
                matchedIds.length || Number(t.frequency || 1)
              ),
              entryIds: matchedIds,
            };
          })
        : [];

      return res.json({ themes });
    } catch (err) {
      return handleGeminiRouteError(
        res,
        err,
        'Unable to extract recurring themes right now.'
      );
    }
  });

  // 5. Reflection Generation (Single-Entry OR Weekly / Monthly Synthesis)
  app.post('/api/ai/generate-reflection', async (req: Request, res: Response) => {
    const ai = requireConsentAndClient(req, res);
    if (!ai) return;

    const { mode, periodLabel, entries, singleText } = req.body as {
      mode?: 'entry' | 'weekly' | 'monthly';
      periodLabel?: string;
      singleText?: string;
      entries?: Array<{ id?: string; date?: string; title?: string; text?: string }>;
    };

    try {
      if (mode === 'entry') {
        const cleanText =
          typeof singleText === 'string' ? singleText.trim().slice(0, 8000) : '';
        if (cleanText.length < 5) {
          return res.status(400).json({
            code: 'TEXT_TOO_SHORT',
            error: 'Please enter or transcribe more text before generating a reflection.',
          });
        }

        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Write a gentle, empathetic companion reflection in response to this private journal note:\n\n"""\n${cleanText}\n"""`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction: `${SAFETY_NON_CLINICAL_BOUNDARY}
Respond like a kind, attentive friend sitting beside the writer in a quiet garden. Keep the reflection to 2–4 warm sentences, plus 1–3 brief theme phrases and a one-sentence gentle takeaway. Never judge, lecture, or diagnose.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                reflectionText: { type: Type.STRING },
                recurringThemes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                gentleTakeaway: { type: Type.STRING },
              },
              required: [
                'title',
                'reflectionText',
                'recurringThemes',
                'gentleTakeaway',
              ],
            },
          },
        });

        const parsed = JSON.parse((response.text ?? '{}').trim()) as {
          title?: string;
          reflectionText?: string;
          recurringThemes?: string[];
          gentleTakeaway?: string;
        };

        return res.json({
          title: String(parsed.title || 'A Gentle Note').slice(0, 140),
          reflectionText: String(parsed.reflectionText || '').slice(0, 2500),
          recurringThemes: Array.isArray(parsed.recurringThemes)
            ? parsed.recurringThemes.slice(0, 6).map((t) => String(t).slice(0, 60))
            : [],
          gentleTakeaway: String(parsed.gentleTakeaway || '').slice(0, 400),
        });
      }

      const validEntries = Array.isArray(entries)
        ? entries
            .filter((e) => typeof e?.text === 'string' && e.text.trim().length >= 5)
            .slice(0, 50)
            .map((e) => ({
              id: String(e.id || ''),
              date: String(e.date || ''),
              title: String(e.title || ''),
              text: String(e.text || '').trim().slice(0, 1500),
            }))
        : [];

      if (validEntries.length === 0) {
        return res.status(400).json({
          code: 'INSUFFICIENT_DATA',
          error:
            'No opted-in journal entries found for this period. Opt in at least one entry first.',
        });
      }

      const periodTypeLabel = mode === 'monthly' ? 'monthly' : 'weekly';
      const serialized = validEntries
        .map(
          (e) =>
            `[${e.date}${e.title ? ` · ${e.title}` : ''}] ${e.text}`
        )
        .join('\n\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Period: ${periodLabel || periodTypeLabel}\nOpted-in journal entries (${validEntries.length}):\n\n${serialized}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          systemInstruction: `${SAFETY_NON_CLINICAL_BOUNDARY}
Synthesize an empathetic, conversational ${periodTypeLabel} memory reflection celebrating honesty, small moments, and emotional threads present in these entries. Keep it grounded strictly in what the user wrote (2 short paragraphs, calm botanical warmth). Include 2–6 short theme names and a one-sentence gentle takeaway.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              reflectionText: { type: Type.STRING },
              recurringThemes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              gentleTakeaway: { type: Type.STRING },
            },
            required: [
              'title',
              'reflectionText',
              'recurringThemes',
              'gentleTakeaway',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        title?: string;
        reflectionText?: string;
        recurringThemes?: string[];
        gentleTakeaway?: string;
      };

      return res.json({
        title: String(
          parsed.title || `${periodLabel || periodTypeLabel} Reflection`
        ).slice(0, 140),
        reflectionText: String(parsed.reflectionText || '').slice(0, 4000),
        recurringThemes: Array.isArray(parsed.recurringThemes)
          ? parsed.recurringThemes.slice(0, 8).map((t) => String(t).slice(0, 60))
          : [],
        gentleTakeaway: String(parsed.gentleTakeaway || '').slice(0, 400),
      });
    } catch (err) {
      return handleGeminiRouteError(
        res,
        err,
        'Unable to generate reflection right now.'
      );
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Trauma Dumping Ground server listening on http://0.0.0.0:${PORT}`
    );
  });
}

createApp().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
