import type { GameMode, Settings, SplitMode } from './types';

/** Ring colours, handed out in order as fingers land. Tuned for a black background. */
export const PALETTE = [
  '#FF6B6B',
  '#FFD166',
  '#4ADE80',
  '#4D96FF',
  '#C77DFF',
  '#FF9F45',
  '#2DD4BF',
  '#FF5FA2',
  '#A3E635',
  '#60A5FA',
];

export const PLAYER_OPTIONS: (number | null)[] = [
  null,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
];

export const HOLD_OPTIONS: { label: string; ms: number }[] = [
  { label: 'Fast · 1.5s', ms: 1500 },
  { label: 'Normal · 2.5s', ms: 2500 },
  { label: 'Long · 3.5s', ms: 3500 },
];

export const CURRENCY_OPTIONS = ['रू', '$', '€', '£', '¥'];

export const SPLIT_OPTIONS: {
  value: SplitMode;
  label: string;
  short: string;
}[] = [
  {
    value: 'one-pays',
    label: 'One pays all',
    short: 'The last finger left pays the whole bill.',
  },
  {
    value: 'weighted',
    label: 'Split by luck',
    short:
      'Everyone pays. First picked pays the least, last picked pays the most.',
  },
];

export const MODE_OPTIONS: {
  value: GameMode;
  label: string;
  short: string;
  hint: string;
}[] = [
  {
    value: 'bill',
    label: 'Bill split',
    short: 'Pick who pays',
    hint: 'Type a bill, then draw the unlucky finger.',
  },
  {
    value: 'first',
    label: 'Who first?',
    short: 'Pick one at random',
    hint: 'One fair draw decides who goes first.',
  },
  {
    value: 'hot',
    label: 'Hot finger',
    short: 'Last light loses',
    hint: 'Rings jump until one finger gets burned.',
  },
];

export function modeLabel(mode: GameMode): string {
  return MODE_OPTIONS.find((option) => option.value === mode)?.label ?? 'Round';
}

export const DEFAULT_SETTINGS: Settings = {
  gameMode: 'bill',
  exactPlayers: null,
  holdMs: 2500,
  currency: 'रू',
  splitMode: 'one-pays',
  sound: true,
  haptics: true,
};

/** Absolute minimum number of fingers needed to run a pick. */
export const MIN_PLAYERS = 2;

export const SAFE_PAUSE_MS = 1400;
