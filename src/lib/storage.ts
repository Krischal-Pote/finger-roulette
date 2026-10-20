import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_SETTINGS, HOLD_OPTIONS, MODE_OPTIONS } from '../constants';
import type {
  GameMode,
  RoundRecord,
  Settings,
  SplitMode,
} from '../types';

const SETTINGS_KEY = 'finger-roulette:settings:v1';
const HISTORY_KEY = 'finger-roulette:history:v1';

/** Keep the list short - it is a convenience, not a database. */
export const HISTORY_LIMIT = 20;

const MODES = MODE_OPTIONS.map((option) => option.value);
const HOLD_VALUES = HOLD_OPTIONS.map((option) => option.ms);
const SPLITS: SplitMode[] = ['one-pays', 'weighted'];

function isMode(value: unknown): value is GameMode {
  return typeof value === 'string' && MODES.includes(value as GameMode);
}

function isSplit(value: unknown): value is SplitMode {
  return typeof value === 'string' && SPLITS.includes(value as SplitMode);
}

function sanitizeSettings(raw: unknown): Partial<Settings> {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const value = raw as Record<string, unknown>;
  const patch: Partial<Settings> = {};

  if (isMode(value.gameMode)) {
    patch.gameMode = value.gameMode;
  }
  if (
    value.exactPlayers === null ||
    (typeof value.exactPlayers === 'number' &&
      Number.isInteger(value.exactPlayers) &&
      value.exactPlayers >= 2 &&
      value.exactPlayers <= 10)
  ) {
    patch.exactPlayers = value.exactPlayers;
  }
  if (
    typeof value.holdMs === 'number' &&
    HOLD_VALUES.includes(value.holdMs)
  ) {
    patch.holdMs = value.holdMs;
  }
  if (typeof value.currency === 'string' && value.currency.length <= 3) {
    patch.currency = value.currency;
  }
  if (isSplit(value.splitMode)) {
    patch.splitMode = value.splitMode;
  }
  if (typeof value.sound === 'boolean') {
    patch.sound = value.sound;
  }
  if (typeof value.haptics === 'boolean') {
    patch.haptics = value.haptics;
  }
  return patch;
}

function sanitizeRecord(raw: unknown): RoundRecord | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const value = raw as Record<string, unknown>;
  if (
    typeof value.id !== 'string' ||
    typeof value.at !== 'number' ||
    !isMode(value.mode) ||
    typeof value.players !== 'number' ||
    typeof value.winnerOrder !== 'number' ||
    typeof value.winnerColor !== 'string' ||
    (value.amount !== null && typeof value.amount !== 'number')
  ) {
    return null;
  }
  return {
    id: value.id,
    at: value.at,
    mode: value.mode,
    players: value.players,
    winnerOrder: value.winnerOrder,
    winnerColor: value.winnerColor,
    amount: value.amount,
  };
}

function parseArray(raw: string | null | undefined): unknown[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Loads saved settings and round history. Never throws: bad data is ignored. */
export async function loadAppState(): Promise<{
  settings: Settings;
  history: RoundRecord[];
}> {
  try {
    const pairs = await AsyncStorage.multiGet([SETTINGS_KEY, HISTORY_KEY]);
    const settingsRaw = pairs.find(([key]) => key === SETTINGS_KEY)?.[1];
    const historyRaw = pairs.find(([key]) => key === HISTORY_KEY)?.[1];

    let stored: unknown = null;
    if (settingsRaw) {
      try {
        stored = JSON.parse(settingsRaw);
      } catch {
        stored = null;
      }
    }

    const history = parseArray(historyRaw)
      .map(sanitizeRecord)
      .filter((record): record is RoundRecord => record !== null)
      .slice(0, HISTORY_LIMIT);

    return {
      settings: { ...DEFAULT_SETTINGS, ...sanitizeSettings(stored) },
      history,
    };
  } catch {
    return { settings: DEFAULT_SETTINGS, history: [] };
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage is a nice-to-have; the game still works without it.
  }
}

export async function saveHistory(history: RoundRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(history.slice(0, HISTORY_LIMIT)),
    );
  } catch {
    // Ignore, see saveSettings.
  }
}
