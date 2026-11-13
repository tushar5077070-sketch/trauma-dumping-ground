export type SeedType = 'daisy' | 'sunflower' | 'lavender';

export type FlowerVariant =
  | 'pink-tulip'
  | 'yellow-tulip'
  | 'orange-tulip'
  | 'purple-wildflower'
  | 'daisy'
  | 'sunflower'
  | 'lavender';

export type ReactionType = 'warmth' | 'sunlight' | 'gentle-rain';

export interface SeedOption {
  id: SeedType;
  numberLabel: string;
  name: string;
  tagline: string;
  description: string;
  defaultFlowerVariant: FlowerVariant;
  accentColor: string;
  petalColor: string;
  glowColor: string;
}

export interface Story {
  storyId: string;
  anonymousId: string;
  content: string;
  seedType: SeedType;
  flowerVariant: FlowerVariant;
  contentWarning: string;
  moderationStatus: 'approved' | 'flagged' | 'removed';
  warmthCount: number;
  messageCount: number;
  positionX: number; // 2 to 98 (%)
  positionY: number; // 5 to 88 (% from bottom of meadow)
  scale: number; // 0.5 to 1.4
  createdAt: Date;
  updatedAt: Date;
  isNewlyPlanted?: boolean;
}

export interface SupportiveMessage {
  messageId: string;
  storyId: string;
  anonymousId: string;
  content: string;
  moderationStatus: 'approved' | 'flagged' | 'removed';
  createdAt: Date;
}

export interface Reaction {
  reactionId: string;
  storyId: string;
  reactionType: ReactionType;
  createdAt: Date;
}

export const SEED_OPTIONS: SeedOption[] = [
  {
    id: 'daisy',
    numberLabel: 'Seed 01',
    name: 'Daisy',
    tagline: 'New beginnings & letting go',
    description: 'Symbolizes new beginnings and letting go.',
    defaultFlowerVariant: 'pink-tulip',
    accentColor: '#F4B8CC',
    petalColor: '#F9D6E2',
    glowColor: 'rgba(244, 184, 204, 0.55)',
  },
  {
    id: 'sunflower',
    numberLabel: 'Seed 02',
    name: 'Sunflower',
    tagline: 'Hope, courage & resilience',
    description: 'Symbolizes hope, courage, and resilience.',
    defaultFlowerVariant: 'yellow-tulip',
    accentColor: '#F7D77D',
    petalColor: '#FCE694',
    glowColor: 'rgba(247, 215, 125, 0.55)',
  },
  {
    id: 'lavender',
    numberLabel: 'Seed 03',
    name: 'Lavender',
    tagline: 'Peace, healing & release',
    description: 'Symbolizes peace, healing, and emotional release.',
    defaultFlowerVariant: 'purple-wildflower',
    accentColor: '#C9B6E4',
    petalColor: '#DFC9F5',
    glowColor: 'rgba(201, 182, 228, 0.55)',
  },
];

export const INITIAL_GARDEN_STORIES: Omit<Story, 'createdAt' | 'updatedAt'>[] = [
  {
    storyId: 'seed_story_1048',
    anonymousId: 'Anonymous Soul #1048',
    content:
      "I spent years pretending that everything was okay because I didn't want anyone to worry about me. Whenever someone asked how I was doing, I had a rehearsed smile ready. Sometimes I still wish someone had looked past the smile and noticed how exhausted I really was.",
    seedType: 'daisy',
    flowerVariant: 'pink-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 42,
    messageCount: 2,
    positionX: 18,
    positionY: 64,
    scale: 1.08,
  },
  {
    storyId: 'seed_story_2091',
    anonymousId: 'Anonymous Soul #2091',
    content:
      'I kept the last voicemail my grandmother left me for four years without listening to it because hearing her voice meant accepting she was gone. Yesterday I finally pressed play while sitting in the sun. She just said she saw a yellow bird on her porch and thought of me.',
    seedType: 'sunflower',
    flowerVariant: 'yellow-tulip',
    contentWarning: 'Grief & loss of a loved one',
    moderationStatus: 'approved',
    warmthCount: 68,
    messageCount: 2,
    positionX: 29,
    positionY: 72,
    scale: 1.12,
  },
  {
    storyId: 'seed_story_3114',
    anonymousId: 'Anonymous Soul #3114',
    content:
      'Growing up, I was always the peacekeeper in a loud, angry house. I learned how to read footsteps on the stairs before anyone even opened a door. Even now, living in my own quiet apartment, my shoulders tense up when a floorboard creaks. I am slowly teaching my body that it is safe here.',
    seedType: 'lavender',
    flowerVariant: 'purple-wildflower',
    contentWarning: 'Childhood household tension',
    moderationStatus: 'approved',
    warmthCount: 53,
    messageCount: 1,
    positionX: 38,
    positionY: 56,
    scale: 0.98,
  },
  {
    storyId: 'seed_story_4027',
    anonymousId: 'Anonymous Soul #4027',
    content:
      'I walked away from a ten-year friendship this spring after realizing I was the only one ever apologizing, reaching out, or making space. It hurts to grieve someone who is still alive, but for the first time in years my chest feels light when I wake up.',
    seedType: 'daisy',
    flowerVariant: 'daisy',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 37,
    messageCount: 1,
    positionX: 48,
    positionY: 68,
    scale: 1.05,
  },
  {
    storyId: 'seed_story_5182',
    anonymousId: 'Anonymous Soul #5182',
    content:
      'Nobody tells you how lonely it feels to outgrow the version of yourself that everyone else found convenient. When I started setting small boundaries, people acted like I had become cold. I am planting this here to remind myself that tenderness includes being tender to myself.',
    seedType: 'sunflower',
    flowerVariant: 'orange-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 49,
    messageCount: 1,
    positionX: 59,
    positionY: 62,
    scale: 1.1,
  },
  {
    storyId: 'seed_story_6309',
    anonymousId: 'Anonymous Soul #6309',
    content:
      'After my burnout last winter, I couldn’t read a single page of a book or answer a text message without crying. I felt like a broken machine. Today I cooked a warm meal from scratch and watched the clouds move for twenty minutes without feeling guilty for resting.',
    seedType: 'lavender',
    flowerVariant: 'lavender',
    contentWarning: 'Severe burnout & exhaustion',
    moderationStatus: 'approved',
    warmthCount: 61,
    messageCount: 1,
    positionX: 71,
    positionY: 70,
    scale: 1.04,
  },
  {
    storyId: 'seed_story_7415',
    anonymousId: 'Anonymous Soul #7415',
    content:
      'I packed my entire life into two suitcases at twenty-two to leave a town where I never felt like I belonged. Some nights the homesickness hits me out of nowhere—not for the place I left, but for a version of home I never actually had.',
    seedType: 'daisy',
    flowerVariant: 'pink-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 31,
    messageCount: 1,
    positionX: 82,
    positionY: 64,
    scale: 1.06,
  },
  {
    storyId: 'seed_story_8204',
    anonymousId: 'Anonymous Soul #8204',
    content:
      'I failed the exam I studied two years for, and I was too ashamed to tell my parents for a week. When I finally told my dad with tears streaming down my face, he just hugged me and asked what I wanted for dinner. I didn’t realize how much I needed unconditional grace.',
    seedType: 'sunflower',
    flowerVariant: 'sunflower',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 74,
    messageCount: 1,
    positionX: 11,
    positionY: 48,
    scale: 1.16,
  },
  {
    storyId: 'seed_story_9031',
    anonymousId: 'Anonymous Soul #9031',
    content:
      'There are words I rehearsed in the shower a thousand times that I will never get to say to the person who hurt me. Leaving them in this meadow feels like finally setting down a suitcase full of stones I have been carrying across every year of my twenties.',
    seedType: 'lavender',
    flowerVariant: 'purple-wildflower',
    contentWarning: 'Emotional hurt & closure',
    moderationStatus: 'approved',
    warmthCount: 45,
    messageCount: 1,
    positionX: 23,
    positionY: 38,
    scale: 1.2,
  },
  {
    storyId: 'seed_story_1592',
    anonymousId: 'Anonymous Soul #1592',
    content:
      'Everyone around me seems to be getting engaged, buying homes, or celebrating promotions, while I am just proud that I made it through a difficult year still breathing and still kind. I hope there is room in the world for quiet survival too.',
    seedType: 'daisy',
    flowerVariant: 'pink-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 83,
    messageCount: 2,
    positionX: 34,
    positionY: 42,
    scale: 1.18,
  },
  {
    storyId: 'seed_story_2764',
    anonymousId: 'Anonymous Soul #2764',
    content:
      'I apologized to my younger self tonight for all the times I blamed them for not knowing better. You were just a kid trying to navigate storms that adults couldn’t even handle. You did the best you could with what you knew.',
    seedType: 'sunflower',
    flowerVariant: 'yellow-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 58,
    messageCount: 1,
    positionX: 53,
    positionY: 44,
    scale: 1.15,
  },
  {
    storyId: 'seed_story_3890',
    anonymousId: 'Anonymous Soul #3890',
    content:
      'For a long time I thought healing meant waking up one morning and never feeling sad about the past again. Now I think healing is just noticing that the wind is warm today, even while carrying the memory of winter.',
    seedType: 'lavender',
    flowerVariant: 'pink-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 64,
    messageCount: 1,
    positionX: 66,
    positionY: 36,
    scale: 1.22,
  },
  {
    storyId: 'seed_story_4419',
    anonymousId: 'Anonymous Soul #4419',
    content:
      'I still set two mugs out on the counter some mornings by mistake. Grief is strange like that—it hides in muscle memory long after your mind has understood that life has changed.',
    seedType: 'daisy',
    flowerVariant: 'orange-tulip',
    contentWarning: 'Loss & bereavement',
    moderationStatus: 'approved',
    warmthCount: 52,
    messageCount: 1,
    positionX: 78,
    positionY: 46,
    scale: 1.14,
  },
  {
    storyId: 'seed_story_5673',
    anonymousId: 'Anonymous Soul #5673',
    content:
      'I spent so much of my life trying to be effortless and low-maintenance so nobody would ever feel burdened by loving me. I am finally learning to ask for help when my hands are full.',
    seedType: 'sunflower',
    flowerVariant: 'pink-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 47,
    messageCount: 1,
    positionX: 89,
    positionY: 54,
    scale: 1.09,
  },
  {
    storyId: 'seed_story_6812',
    anonymousId: 'Anonymous Soul #6812',
    content:
      'Sometimes the bravest thing I do all day is forgive myself for the days when I had nothing left to give. If you are reading this and feeling behind in life: you are not late, you are just healing at a human pace.',
    seedType: 'lavender',
    flowerVariant: 'yellow-tulip',
    contentWarning: '',
    moderationStatus: 'approved',
    warmthCount: 91,
    messageCount: 2,
    positionX: 43,
    positionY: 26,
    scale: 1.26,
  },
];

export const INITIAL_SUPPORTIVE_MESSAGES: Record<
  string,
  Omit<SupportiveMessage, 'createdAt'>[]
> = {
  seed_story_1048: [
    {
      messageId: 'msg_init_1',
      storyId: 'seed_story_1048',
      anonymousId: 'Kind Gardener #402',
      content: 'I see you now. You never had to carry all of that weight in silence.',
      moderationStatus: 'approved',
    },
    {
      messageId: 'msg_init_2',
      storyId: 'seed_story_1048',
      anonymousId: 'Kind Gardener #819',
      content: 'Thank you for letting your guard rest here. Wishing you gentle, unhurried days ahead.',
      moderationStatus: 'approved',
    },
  ],
  seed_story_2091: [
    {
      messageId: 'msg_init_3',
      storyId: 'seed_story_2091',
      anonymousId: 'Kind Gardener #315',
      content: 'What a tender gift she left for you. Every time you see a yellow bird, I hope you feel her warmth.',
      moderationStatus: 'approved',
    },
  ],
  seed_story_1592: [
    {
      messageId: 'msg_init_4',
      storyId: 'seed_story_1592',
      anonymousId: 'Kind Gardener #704',
      content: 'Staying kind after a hard year is one of the greatest achievements there is. Proud of you.',
      moderationStatus: 'approved',
    },
  ],
};
