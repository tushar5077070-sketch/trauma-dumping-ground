export type ModerationCategory =
  | 'clean'
  | 'personal_name_or_pii'
  | 'insult_or_belittling'
  | 'dismissive_or_mocking'
  | 'self_harm_or_threat'
  | 'profanity_or_slur'
  | 'harassment'
  | 'spam'
  | 'unkind_tone'
  | 'moderation_unavailable';

export interface ModerationCheckResult {
  allowed: boolean;
  reason?: string;
  category?: ModerationCategory;
}

export interface DeobfuscatedTextViews {
  cleanOriginal: string;
  deobfuscatedReadable: string;
  leetspeakNormalized: string;
  singleRepeatNormalized: string;
  devanagariNormalized: string;
  obfuscatedTokens: string[];
}

// Common Cyrillic & Greek homoglyphs mapped to ASCII Latin lookalikes
const HOMOGLYPH_MAP: Record<string, string> = {
  '\u0430': 'a', // а
  '\u0410': 'A', // А
  '\u0435': 'e', // е
  '\u0415': 'E', // Е
  '\u043E': 'o', // о
  '\u041E': 'O', // О
  '\u0440': 'p', // р
  '\u0420': 'P', // Р
  '\u0441': 'c', // с
  '\u0421': 'C', // С
  '\u0443': 'y', // у
  '\u0423': 'Y', // У
  '\u0445': 'x', // х
  '\u0425': 'X', // Х
  '\u0456': 'i', // і
  '\u0406': 'I', // І
  '\u0458': 'j', // ј
  '\u0408': 'J', // Ј
  '\u043A': 'k', // к
  '\u041A': 'K', // К
  '\u043C': 'm', // м
  '\u041C': 'M', // М
  '\u043D': 'h', // н
  '\u041D': 'H', // Н
  '\u0442': 't', // т
  '\u0422': 'T', // Т
  '\u0432': 'b', // в
  '\u0412': 'B', // В
  '\u03B1': 'a', // α
  '\u03B5': 'e', // ε
  '\u03BF': 'o', // ο
  '\u03C1': 'p', // ρ
  '\u03BA': 'k', // κ
  '\u03C7': 'x', // χ
  '\u03B9': 'i', // ι
  '\u03C5': 'u', // υ
};

const SAFE_DOTTED_ABBREVIATIONS = new Set([
  'a.m',
  'p.m',
  'e.g',
  'i.e',
  'u.s',
  'u.s.a',
  'u.k',
  'p.h.d',
  'ph.d',
  'etc',
  'o.k',
  'd.m',
  't.v',
  'w.f.h',
  'i.d.k',
  't.b.h',
  's.o.s',
]);

function foldHomoglyphs(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    out += HOMOGLYPH_MAP[ch] ?? ch;
  }
  return out;
}

function stripInvisibleChars(input: string): string {
  // Normalize fullwidth / fancy math Unicode letters to standard characters
  let s = input.normalize('NFKC');
  // Strip zero-width spaces, soft hyphens, directional marks, variation selectors
  s = s.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u00AD\uFE00-\uFE0F]/g, '');
  // Fold homoglyphs
  s = foldHomoglyphs(s);
  // Strip combining marks attached to Latin letters while keeping Devanagari matras intact
  s = s.replace(/([A-Za-z])[\u0300-\u036F]+/g, '$1');
  return s;
}

function decodeLeetspeak(input: string): string {
  return input
    .replace(/@/g, 'a')
    .replace(/4/g, 'a')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/!/g, 'i')
    .replace(/\|/g, 'i')
    .replace(/3/g, 'e')
    .replace(/\$/g, 's')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b');
}

/**
 * Reconstructs clean words from symbol-interleaved or spaced-out obfuscations such as:
 * "T*u*s*h*a*r", "T.u.s.h.a.r", "T_u_s_h_a_r", "T u s h a r", "b.h.o.s.d.i.k.e", "c*h*u*t*i*y*a"
 * while preserving normal prose punctuation and readability.
 */
export function deobfuscateText(raw: string): DeobfuscatedTextViews {
  const cleanOriginal = stripInvisibleChars(raw || '');
  const obfuscatedTokens: string[] = [];

  // Normalize ellipses ("...") to spaces so sloppy typing like "wait...what...why" is never flagged as obfuscation
  let readable = cleanOriginal.replace(/\.{2,}/g, ' ');

  // 1. Collapse spaced-out single-letter + separator runs: e.g. "T . u . s . h . a . r" or "T * u * s * h * a * r"
  readable = readable.replace(
    /\b(?:[A-Za-z]\s*[.*_\-#~^|/\\+%$@!=:,;]+\s*){2,}[A-Za-z]\b/g,
    (match) => {
      const cleaned = match.replace(/[^A-Za-z]/g, '');
      const dottedKey = match
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/\.+$/, '');
      if (SAFE_DOTTED_ABBREVIATIONS.has(dottedKey)) {
        return match;
      }
      if (cleaned.length >= 3) {
        obfuscatedTokens.push(cleaned);
      }
      return cleaned;
    }
  );

  // 2. Collapse spaced single Latin letters of 4+ chars (e.g., "T u s h a r", "c h u t i y a", "b s d k")
  readable = readable.replace(
    /(?:^|(?<=\s))([A-Za-z])(?:\s+[A-Za-z]){3,}(?=\s|[.,!?;:]|$)/g,
    (match) => {
      const compact = match.replace(/\s+/g, '');
      // Avoid merging natural English openings like "I a m a ..." if first two tokens are "I a"
      if (/^i\s+a\b/i.test(match.trim())) {
        return match;
      }
      obfuscatedTokens.push(compact);
      return compact;
    }
  );

  // 3. Collapse 3-letter spaced high-risk acronyms like "k y s", "m k c", "b k l", "a s s"
  readable = readable.replace(
    /\b(k\s+y\s+s|m\s+k\s+c|b\s+k\s+l|b\s+k\s+c|m\s+k\s+l|a\s+s\s+s|f\s+u\s+k|f\s+c\s+k|b\s+c|m\s+c)\b/gi,
    (match) => match.replace(/\s+/g, '')
  );

  // 4. Decode tokens with non-prose special characters embedded between letters:
  //    e.g., "T*u*s*h*a*r", "Tu_sh_ar", "T#ush#ar", "T.u.s.h.a.r", "T(u)s(h)a(r)", "T@u@s@h@a@r", "ch*tiya", "f*ck"
  const rawTokens = readable.split(/(\s+)/);
  const processedTokens = rawTokens.map((tok) => {
    if (!tok || /^\s+$/.test(tok)) return tok;

    // Preserve URLs/emails so PII detector can see them as-is
    if (/^https?:\/\//i.test(tok) || /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(tok)) {
      return tok;
    }

    // Separate leading/trailing normal punctuation
    const edgeMatch = tok.match(/^([("'[\]{}<>.,!?;:]*)(.*?)([)"'[\]{}<>.,!?;:]*)$/);
    const prefix = edgeMatch?.[1] ?? '';
    const core = edgeMatch?.[2] ?? tok;
    const suffix = edgeMatch?.[3] ?? '';

    if (!core || core.length < 3) return tok;

    // Check safe abbreviations like e.g., i.e., a.m., u.s.a
    const coreDotLower = core.toLowerCase().replace(/\.+$/, '');
    if (SAFE_DOTTED_ABBREVIATIONS.has(coreDotLower)) {
      return tok;
    }

    // Case A: Non-prose obfuscation symbols embedded INSIDE a letter word
    // (e.g., T*u*s*h*a*r, Tu_shar, T#u#s#h#a#r, T@u@s@h@a@r, T(u)s(h)a(r), bh*sdike, f*ck)
    const hasHardObfuscationSymbol =
      /[A-Za-z][*_#~^|\\+%$@!=()[\]{}<>]+[A-Za-z]/.test(core);

    // Case B: Repeated dots/hyphens/slashes/commas inside a single token (e.g., T.u.s.h.a.r, T-u-s-h-a-r, Tu.sh.ar)
    const internalSoftSepCount = (
      core.match(/[A-Za-z][.\-/,;:]+[A-Za-z]/g) || []
    ).length;
    const isSingleLetterSeparated =
      /^(?:[A-Za-z][.\-/,;:_*#~^|\\+%$@!=()[\]{}<>]+){2,}[A-Za-z]$/.test(core);

    if (isSingleLetterSeparated) {
      const stripped = core.replace(/[^A-Za-z]/g, '');
      if (stripped.length >= 3) {
        obfuscatedTokens.push(stripped);
      }
      return `${prefix}${stripped}${suffix}`;
    }

    if (hasHardObfuscationSymbol) {
      // Distinguish repeated separator (T@u@s@h@a@r -> Tushar) vs leetspeak (Tush@r -> Tushar)
      const symbolMatches = core.match(/[*_#~^|\\+%$@!=()[\]{}<>]/g) || [];
      const uniqueSymbols = new Set(symbolMatches);
      let decoded: string;
      if (
        symbolMatches.length >= 2 &&
        uniqueSymbols.size === 1 &&
        /^[A-Za-z](?:[*_#~^|\\+%$@!=][A-Za-z])+$/.test(core)
      ) {
        decoded = core.replace(/[^A-Za-z]/g, '');
      } else {
        // First strip pure filler symbols (* _ # ~ ^ \ + % ( ) [ ] { } < >), then decode leetspeak (@ $ ! |)
        decoded = decodeLeetspeak(
          core.replace(/[*_#~^\\+%()[\]{}<>]/g, '')
        ).replace(/[^A-Za-z0-9]/g, '');
      }
      if (decoded.length >= 3) {
        obfuscatedTokens.push(decoded);
      }
      return `${prefix}${decoded}${suffix}`;
    }

    if (internalSoftSepCount >= 2) {
      // Allow normal multi-word phrases like "day-to-day" or "he/she/they";
      // flag repeated separators when short fragments (1-2 chars, like "Tu.sh.ar" or "T-u-s-h-a-r") are used to disguise a word
      const parts = core.split(/[.\-/,;:]+/).filter(Boolean);
      const hasSingleCharPiece = parts.some((p) => p.length === 1);
      const shortFragmentCount = parts.filter((p) => p.length <= 2).length;
      const usesDotOrSemiSep = /[.;:]/.test(core);
      if (
        hasSingleCharPiece ||
        (usesDotOrSemiSep && shortFragmentCount >= 2)
      ) {
        const stripped = core.replace(/[^A-Za-z]/g, '');
        if (stripped.length >= 3) {
          obfuscatedTokens.push(stripped);
        }
        return `${prefix}${stripped}${suffix}`;
      }
    }

    return tok;
  });

  readable = processedTokens.join('');

  // 5. Collapse Devanagari obfuscations (symbols or single-char spaces between Devanagari characters)
  let devanagariNormalized = cleanOriginal.replace(
    /([\u0900-\u097F])[*_.\-#~^|/\\+%$@!=()[\]{}<>,;:]+(?=[\u0900-\u097F])/g,
    '$1'
  );
  // Also collapse spaced single Devanagari chars (3+ single Devanagari graphemes separated by spaces)
  devanagariNormalized = devanagariNormalized.replace(
    /(?:^|(?<=\s))[\u0900-\u097F](?:\s+[\u0900-\u097F]){2,}(?=\s|[.,!?;:|।]|$)/g,
    (match) => match.replace(/\s+/g, '')
  );

  // If Devanagari had obfuscated separators stripped, reflect it in readable too
  if (devanagariNormalized !== cleanOriginal) {
    readable = readable.replace(
      /([\u0900-\u097F])[*_.\-#~^|/\\+%$@!=()[\]{}<>,;:]+(?=[\u0900-\u097F])/g,
      '$1'
    );
  }

  // 6. Build lowercase leetspeak-decoded & repeat-collapsed variants for reliable word matching
  const leetBase = decodeLeetspeak(readable.toLowerCase());
  const leetspeakNormalized = leetBase.replace(/([a-z])\1{2,}/g, '$1');
  const singleRepeatNormalized = leetBase.replace(/([a-z])\1+/g, '$1');

  return {
    cleanOriginal,
    deobfuscatedReadable: readable,
    leetspeakNormalized,
    singleRepeatNormalized,
    devanagariNormalized,
    obfuscatedTokens: Array.from(new Set(obfuscatedTokens)),
  };
}

// -----------------------------------------------------------------------------
// Multilingual Abusive / Profane Word & Phrase Rules (English + Hindi + Hinglish + Devanagari)
// -----------------------------------------------------------------------------

// Blocked EVERYWHERE (stories, content warnings, AND supportive replies)
const UNIVERSAL_ENGLISH_ABUSE_REGEX =
  /\b(fuck|fucking|fucker|fuckers|fucked|fucks|fck|fuk|fvck|phuck|motherfucker|motherfucking|motherfuckers|mofo|shit|shitty|shitting|bullshit|bitch|bitches|bitching|biatch|asshole|assholes|arsehole|bastard|bastards|cunt|cunts|dick|dicks|dickhead|dickheads|cock|cocks|cocksucker|pussy|pussies|slut|sluts|slutty|whore|whores|twat|prick|pricks|wanker|douchebag|jackass|dumbass|retard|retarded|faggot|faggots|fag|fags|nigger|niggers|nigga|niggas|kike|chink|spic|paki|wetback|tranny|stfu|gtfo|kys|kill\s*your\s*self|k\s*y\s*s|end\s*your\s*life|go\s+die|hope\s+you\s+die|you\s+should\s+die|drop\s+dead|better\s+off\s+dead|fuck\s+you|screw\s+you|suck\s+my\s+dick)\b/i;

// Censored English profanity patterns like f*ck, f**k, sh*t, b*tch, a**hole, c*nt, wh*re, sl*t
const CENSORED_PROFANITY_REGEX =
  /\b(f[*_#x@!.-]{1,3}c?k(?:ing|er|ed|s)?|sh[*_#x@!.-]{1,2}t(?:ty|s)?|b[*_#x@!.-]{1,2}tch(?:es|ing)?|a[*_#x@!.-]{1,2}h[o0*]le|c[*_#x@!.-]{1,2}nt|wh[*_#x@!.-]{1,2}re|sl[*_#x@!.-]{1,2}t|ch[*_#x@!.-]{1,2}tiy[ae]|bh[*_#x@!.-]{1,2}sd[i1*]k[ea]|m[*_#x@!.-]{1,2}darch[o0*]d|b[*_#x@!.-]{1,2}hench[o0*]d|g[*_#x@!.-]{1,2}ndu?|l[*_#x@!.-]{1,2}nd|r[*_#x@!.-]{1,2}ndi|h[*_#x@!.-]{1,2}rami|k[*_#x@!.-]{1,2}min[aei])\b/i;

// Hindi / Hinglish (Romanized Hindi) abusive words, gaalis, and derogatory curses
const HINDI_HINGLISH_ABUSE_REGEX =
  /\b(madarchod|maderchod|maadarchod|madarchood|madarchodh|mdrchd|madarjat|madarjaat|maachod|machod|baapchod|betichod|bhatichod|behenchod|bhenchod|bahanchod|bhanchod|behnchod|bhnchd|bhenchood|behenchood|bhenkelode|behenkelode|bhosdike|bhosadike|bhosdi|bhosda|bhosada|bhosdika|bhosdiki|bhosdiwala|bhosdiwale|bhosdiwali|bhosad|bsdk|bhosdk|bhosrike|bhosri|chutiya|chutiye|chutya|chutia|chutiyaa|chutiyapa|chutiyap|chutiyaap|chutiyapanti|chut|choot|chootiya|chootiye|chutmarike|chutmarika|chutmarani|chutmar|gandu|gaandu|ganduu|gaand|gand|gandmara|gaandmara|gandmasti|gandfat|gandphat|gandwa|lund|lauda|laude|lavda|lavde|lawda|lawde|loda|lode|lodu|laura|laure|lundfakir|lundbaaz|randi|raandi|raand|randwa|randirona|randikhana|randibaz|randibaaz|chinaal|chinal|chinaar|chinar|chhinaal|chhinal|harami|haraami|haramkhor|haraamkhor|haramzada|haramzade|haramzadi|haramjaada|haramjaadi|haramzaada|kamina|kameena|kamine|kameene|kamini|kameeni|kaminey|kutta|kutte|kutti|kutiya|kuttiya|saala|saale|saali|bhadwa|bhadwe|bhadwi|bhadva|bhadve|bhadvi|bharwa|bharwe|dalla|dalle|dallal|chod|chodu|chodna|chodo|chodunga|chodega|chudai|chudaai|chudwa|chudwana|chudwaya|chudne|chudti|chudta|chud|jhaant|jhant|jhaantu|jhatu|jhaatu|tatti|tatte|suar|suwar|hijda|hijra|chhakka|namard|napunsak|beghairat|ghatiya|nalayak|badtameez|bakchod|bakchodi|bakchood|tharki|hawasi|mutthal|muthal|mkc|tmkc|bkl|bkc|mkl|pkmb|lkb)\b/i;

// Multi-word Hindi / Hinglish abusive phrases & contextual short abbreviations (mc / bc / sala)
const HINDI_HINGLISH_PHRASE_REGEX =
  /\b(maa\s+ki\s+(chut|choot|aankh|gaand|gand|bhosda|bhosdi)|ma\s+ki\s+(chut|choot|gaand|gand)|maa\s+ka\s+(bhosda|bhosada|lauda|lund)|teri\s+(maa|ma|behen|bhen|bahan)\s+(ki|ka|ko)|behen\s+ke\s+(lode|laude|lavde|lawde|takke)|bhen\s+ke\s+(lode|laude|lavde|lawde)|behen\s+ki\s+(chut|lodi|laudi)|bhen\s+ki\s+(chut|lodi|laudi)|gaand\s+(mara|mar|marwa|phat|fat|mein|me)|gand\s+(mara|mar|marwa|phat|fat)|randi\s+rona|kutte\s+ki\s+aulad|suar\s+ki\s+aulad|ullu\s+ka\s+pattha|chup\s+kar\s+(kutta|kutte|chutiye|gandu|saale|sale|harami|kamine)|tu\s+(sala|sale|mc|bc|kutta|chutiya|gandu|harami|kamina)|abe\s+(sala|sale|mc|bc|chutiye|gandu|kutte)|oye\s+(sala|sale|mc|bc|chutiye|gandu)|mc\s+bc|bc\s+mc)\b/i;

// Standalone Hindi abbreviated gaalis ("mc" / "bc") excluding innocent contexts like "500 BC" or "McDonald's"
const STANDALONE_MC_BC_REGEX = /(?<!\d\s)(?<!\d)\b(mc|bc)\b(?!\s*donald)/i;

// Devanagari Hindi abusive words & phrases (matched cleanly against devanagariNormalized)
const DEVANAGARI_ABUSE_TERMS = [
  'मादरचोद',
  'मदरचोद',
  'मादरचो',
  'बहनचोद',
  'भेनचोद',
  'बहनचो',
  'भोसड़ीके',
  'भोसडीके',
  'भोसदिके',
  'भोसड़ी',
  'भोसडी',
  'भोसड़ा',
  'भोसडा',
  'चूतिया',
  'चुतिया',
  'चूतिये',
  'चुतिये',
  'चूतियापा',
  'चूत',
  'चूतमारी',
  'गांडू',
  'गाँडू',
  'गांड',
  'गाँड',
  'लंड',
  'लण्ड',
  'लौड़ा',
  'लौडा',
  'लौड़े',
  'लौडे',
  'लोड़ा',
  'लोडा',
  'लोड़े',
  'लोडू',
  'रंडी',
  'रांड',
  'राँड',
  'रंडवा',
  'रंडीखाना',
  'हरामी',
  'हरामखोर',
  'हरामजादा',
  'हरामजादी',
  'हरामज़ादा',
  'हरामज़ादी',
  'कमीना',
  'कमीने',
  'कमीनी',
  'कुत्ता',
  'कुत्ते',
  'कुत्ती',
  'कुतिया',
  'साला',
  'साले',
  'साली',
  'भड़वा',
  'भड़वे',
  'भडवा',
  'भडवे',
  'छिनार',
  'छिनाल',
  'चोदू',
  'चोदना',
  'चोदूंगा',
  'चुदाई',
  'चुदवा',
  'चुदवाना',
  'झाँट',
  'झांट',
  'झाटू',
  'झाँटू',
  'टट्टी',
  'टट्टे',
  'सुअर',
  'सूअर',
  'दल्ला',
  'दल्ले',
  'बकचोद',
  'बकचोदी',
  'ठरकी',
  'हवसी',
  'माँ की चूत',
  'मां की चूत',
  'माँ का भोसड़ा',
  'मां का भोसड़ा',
  'तेरी माँ की',
  'तेरी मां की',
  'तेरी बहन की',
  'बहन के लौड़े',
  'गांड मरा',
  'गाँड मरा',
];

// Unambiguous long abusive stems safe to scan even inside fully collapsed text (e.g. "m.a.d.a.r.c.h.o.d")
const HIGH_SEVERITY_COMPACT_STEMS = [
  'madarchod',
  'maderchod',
  'behenchod',
  'bhenchod',
  'bahanchod',
  'bhanchod',
  'bhosdike',
  'bhosadike',
  'bhosdika',
  'bhosdiwale',
  'chutiya',
  'chutiye',
  'chutiyapa',
  'chootiya',
  'haramkhor',
  'haramzada',
  'haramzadi',
  'gandmara',
  'gaandmara',
  'randikhana',
  'randirona',
  'motherfucker',
  'asshole',
  'dumbass',
  'scumbag',
  'killyourself',
  'killurself',
  'bhenkelode',
  'behenkelode',
  'maakichut',
  'maakabhosda',
  'terimaaki',
  'teribehenki',
  'bakchod',
  'chutmarike',
];

// Additional words blocked in supportive replies ("Leave a kind message")
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
  'deserved',
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
  'pagal',
  'gadha',
  'gadhe',
  'bewakoof',
  'bevakoof',
  'bakwas',
  'nautanki',
  'natak',
  'bekar',
  'faltu',
  'nikamma',
]);

const SUPPORTIVE_REPLY_EXTRA_PHRASES: Array<{
  pattern: RegExp;
  category: ModerationCategory;
  reason: string;
}> = [
  {
    pattern:
      /\b(nobody\s+cares|no\s+one\s+cares|who\s+cares|don'?t\s+care|i\s+don'?t\s+care|shut\s+up|grow\s+up|man\s+up|get\s+over\s+it|stop\s+crying|stop\s+whining|stop\s+complaining|cry\s+more|keep\s+crying|boo\s*hoo|womp\s*womp|skill\s+issue|suck\s+it\s+up|deal\s+with\s+it|attention\s+seeker|seeking\s+attention|for\s+attention|pick\s+me|overreacting|being\s+dramatic|so\s+dramatic|chup\s+kar|chup\s+ho\s+ja|rona\s+band\s+kar|kisi\s+ko\s+fark\s+nahi)\b/i,
    category: 'dismissive_or_mocking',
    reason:
      'Dismissive or mocking remarks are not allowed here. Please share only gentle, supportive words.',
  },
  {
    pattern:
      /\b(you\s+deserve\s+(it|this|that)|you\s+deserved\s+(it|this|that)|your\s+own\s+fault|all\s+your\s+fault|blame\s+yourself|i\s+hate\s+you|everyone\s+hates\s+you|nobody\s+likes\s+you|no\s+one\s+likes\s+you|you\s+suck|shame\s+on\s+you|waste\s+of\s+(space|air|oxygen|life))\b/i,
    category: 'harassment',
    reason:
      'Hostile or blaming messages are blocked. Please offer kindness or step back quietly.',
  },
];

// -----------------------------------------------------------------------------
// Deterministic PII & Direct Personal-Name Detection
// -----------------------------------------------------------------------------

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const SOCIAL_HANDLE_REGEX =
  /(?:^|\s)@[a-zA-Z0-9._]{3,30}\b|\b(?:instagram|insta|ig|snapchat|snap|telegram|whatsapp|twitter|tiktok)\s*(?:id|handle|username|is|:|-|@)\s*[@a-zA-Z0-9._-]{3,}/i;

// Common non-name words that frequently follow "my name is" or "I am" so we avoid false positives
const NON_NAME_WORDS = new Set([
  'a', 'an', 'the', 'so', 'very', 'just', 'still', 'really', 'not', 'no', 'never',
  'here', 'there', 'tired', 'sad', 'lost', 'alone', 'lonely', 'broken', 'hurt',
  'hurting', 'scared', 'afraid', 'anxious', 'depressed', 'stressed', 'exhausted',
  'done', 'okay', 'ok', 'fine', 'sorry', 'grateful', 'thankful', 'happy', 'angry',
  'mad', 'numb', 'empty', 'weak', 'strong', 'trying', 'crying', 'dying', 'falling',
  'healing', 'growing', 'learning', 'waiting', 'hoping', 'wishing', 'missing',
  'feeling', 'going', 'coming', 'leaving', 'staying', 'working', 'studying',
  'living', 'breathing', 'hiding', 'running', 'fighting', 'struggling', 'sinking',
  'drowning', 'floating', 'bleeding', 'shaking', 'trembling', 'smiling', 'laughing',
  'someone', 'nobody', 'noone', 'anyone', 'everyone', 'anonymous', 'unsaid',
  'human', 'alive', 'dead', 'gone', 'back', 'home', 'out', 'in', 'up', 'down',
  'over', 'under', 'done', 'sick', 'ill', 'well', 'better', 'worse', 'good', 'bad',
  'glad', 'proud', 'ashamed', 'guilty', 'jealous', 'envious', 'confused', 'stuck',
  'trapped', 'free', 'safe', 'unsafe', 'ready', 'unready', 'sure', 'unsure',
  'certain', 'uncertain', 'wrong', 'right', 'honest', 'lying', 'fake', 'real',
  'true', 'false', 'only', 'even', 'also', 'always', 'sometimes', 'often', 'too',
  'student', 'teacher', 'doctor', 'engineer', 'mother', 'father', 'mom', 'dad',
  'sister', 'brother', 'friend', 'partner', 'husband', 'wife', 'boyfriend',
  'girlfriend', 'son', 'daughter', 'child', 'kid', 'teen', 'adult', 'person',
  'man', 'woman', 'boy', 'girl', 'guy', 'soul', 'stranger', 'gardener',
  'bahut', 'bohot', 'thak', 'akela', 'akeli', 'udaas', 'pareshan', 'dukh', 'dukhi',
  'khush', 'theek', 'thik', 'nahi', 'nhi', 'kuch', 'koi', 'sab', 'yahan', 'wahan',
]);

// Explicit self-identification / naming phrases in English & Hinglish
const EXPLICIT_NAME_INTRO_REGEX =
  /\b(?:my\s+name\s+is|call\s+me|his\s+name\s+is|her\s+name\s+is|their\s+name\s+is|mera\s+naam|uska\s+naam|uski\s+naam|uske\s+naam)\s+([a-zA-Z]{2,24})\b/i;

function containsPhoneNumber(text: string): boolean {
  const candidates = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/g);
  if (!candidates) return false;
  for (const c of candidates) {
    const digits = c.replace(/\D/g, '');
    // Ignore simple years/dates like 2024-2026 (8 digits) — phone numbers have >= 9 digits
    if (digits.length >= 9 && digits.length <= 15) {
      return true;
    }
  }
  return false;
}

function checkAbusiveLanguage(views: DeobfuscatedTextViews): ModerationCheckResult | null {
  const textsToTest = [
    views.cleanOriginal,
    views.deobfuscatedReadable,
    views.leetspeakNormalized,
    views.singleRepeatNormalized,
  ];

  // 1. Censored profanity (e.g., f*ck, b*tch, ch*tiya, bh*sdike)
  if (CENSORED_PROFANITY_REGEX.test(views.cleanOriginal)) {
    return {
      allowed: false,
      category: 'profanity_or_slur',
      reason:
        'Abusive or profane words (including censored or symbol-disguised spellings) cannot be posted in Unsaid.',
    };
  }

  // 2. English + Hindi/Hinglish word & phrase abuse across original, de-obfuscated, and leetspeak views
  for (const t of textsToTest) {
    if (
      UNIVERSAL_ENGLISH_ABUSE_REGEX.test(t) ||
      HINDI_HINGLISH_ABUSE_REGEX.test(t) ||
      HINDI_HINGLISH_PHRASE_REGEX.test(t) ||
      STANDALONE_MC_BC_REGEX.test(t)
    ) {
      return {
        allowed: false,
        category: 'profanity_or_slur',
        reason:
          'Abusive, profane, or harmful language (in English, Hindi, or Hinglish) cannot be planted in the garden. Please keep Unsaid gentle and respectful.',
      };
    }
  }

  // 3. Devanagari Hindi abuse (including symbol/space obfuscated Devanagari)
  const devCompact = views.devanagariNormalized;
  for (const term of DEVANAGARI_ABUSE_TERMS) {
    if (devCompact.includes(term)) {
      return {
        allowed: false,
        category: 'profanity_or_slur',
        reason:
          'Abusive or profane Hindi language cannot be posted in Unsaid. Please share your feelings respectfully.',
      };
    }
  }

  // 4. High-severity compact stems inside symbol/space-collapsed text (e.g. "m.a.d.a.r.c.h.o.d", "b h o s d i k e")
  const compactAlpha = views.leetspeakNormalized.replace(/[^a-z]/g, '');
  const compactSingle = views.singleRepeatNormalized.replace(/[^a-z]/g, '');
  for (const stem of HIGH_SEVERITY_COMPACT_STEMS) {
    if (compactAlpha.includes(stem) || compactSingle.includes(stem)) {
      return {
        allowed: false,
        category: 'profanity_or_slur',
        reason:
          'Abusive or profane language (including spaced or symbol-separated text) cannot be planted in the garden.',
      };
    }
  }

  return null;
}

function checkDirectPiiLocal(views: DeobfuscatedTextViews): ModerationCheckResult | null {
  const { cleanOriginal, deobfuscatedReadable } = views;

  if (EMAIL_REGEX.test(cleanOriginal) || containsPhoneNumber(cleanOriginal)) {
    return {
      allowed: false,
      category: 'personal_name_or_pii',
      reason:
        'To protect anonymity and safety, email addresses and phone numbers cannot be shared in the meadow.',
    };
  }

  if (SOCIAL_HANDLE_REGEX.test(cleanOriginal)) {
    return {
      allowed: false,
      category: 'personal_name_or_pii',
      reason:
        'To keep Unsaid completely anonymous, social media handles and usernames cannot be posted.',
    };
  }

  if (views.obfuscatedTokens.length > 0) {
    return {
      allowed: false,
      category: 'personal_name_or_pii',
      reason:
        'Words disguised with special characters or spaced-out letters cannot be planted. Please write normally without personal names or abusive language.',
    };
  }

  for (const text of [cleanOriginal, deobfuscatedReadable]) {
    const introMatch = text.match(EXPLICIT_NAME_INTRO_REGEX);
    if (introMatch && introMatch[1]) {
      const candidate = introMatch[1].toLowerCase();
      if (!NON_NAME_WORDS.has(candidate)) {
        return {
          allowed: false,
          category: 'personal_name_or_pii',
          reason:
            'Real personal names cannot be included in public meadow stories. Please remove the name to keep everyone anonymous and safe.',
        };
      }
    }
  }

  return null;
}

/**
 * Deterministic check for planted stories (and content warnings).
 * Catches English/Hindi/Hinglish/Devanagari profanity & abuse, obfuscations, and direct PII immediately.
 * Followed by Gemini AI for deep personal-name detection (normal & obfuscated) and contextual abuse.
 */
export function checkPlantedStoryLocal(text: string): ModerationCheckResult {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return { allowed: true, category: 'clean' };
  }

  const views = deobfuscateText(trimmed);

  const abuseHit = checkAbusiveLanguage(views);
  if (abuseHit) return abuseHit;

  const piiHit = checkDirectPiiLocal(views);
  if (piiHit) return piiHit;

  return { allowed: true, category: 'clean' };
}

/**
 * Deterministic check for supportive replies ("Leave a kind message").
 * Enforces all story safety rules PLUS blocks belittling, dismissive, or mocking words.
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

  const views = deobfuscateText(trimmed);

  // 1. Universal abuse & profanity (English + Hindi + Hinglish + Devanagari)
  const abuseHit = checkAbusiveLanguage(views);
  if (abuseHit) return abuseHit;

  // 2. Direct PII / personal names
  const piiHit = checkDirectPiiLocal(views);
  if (piiHit) return piiHit;

  // 3. Dismissive / hostile reply phrases
  for (const rule of SUPPORTIVE_REPLY_EXTRA_PHRASES) {
    if (
      rule.pattern.test(views.cleanOriginal) ||
      rule.pattern.test(views.deobfuscatedReadable) ||
      rule.pattern.test(views.leetspeakNormalized)
    ) {
      return {
        allowed: false,
        category: rule.category,
        reason: rule.reason,
      };
    }
  }

  // 4. Token-level unkind/belittling words
  const tokens = views.leetspeakNormalized
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  for (const word of tokens) {
    const stripped = word.replace(/^'+|'+$/g, '');
    if (SUPPORTIVE_REPLY_BLOCKED_WORDS.has(stripped)) {
      return {
        allowed: false,
        category: 'insult_or_belittling',
        reason:
          'Unsaid only allows gentle, supportive replies. Hurtful or judgmental words cannot be sent.',
      };
    }
  }

  // 5. Obfuscated single-word/short-message insults (e.g., "p.a.t.h.e.t.i.c", "l-o-s-e-r")
  const compact = views.leetspeakNormalized.replace(/[^a-z0-9]+/g, '');
  const shortInsultStems = [
    'pathetic',
    'worthless',
    'useless',
    'crybaby',
    'loser',
    'cringe',
    'idiot',
    'moron',
    'stupid',
  ];
  for (const stem of shortInsultStems) {
    if (compact === stem || (compact.length <= 22 && compact.includes(stem))) {
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
