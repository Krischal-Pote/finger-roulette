/** A single finger currently resting on the play surface. */
export type Finger = {
  /** Native touch identifier, unique while the finger stays down. */
  id: number;
  /** Position relative to the top-left corner of the play surface. */
  x: number;
  y: number;
  /** Ring colour assigned when the finger landed. */
  color: string;
  /** 1-based label shown in the ring and in the result ("#3 doesn't pay"). */
  order: number;
};

/**
 * idle     – collecting fingers / running the hold countdown
 * spinning – the roulette animation is running (touches ignored, set frozen)
 * safe     – a finger was just picked and is now out (touches ignored). Shown
 *            briefly, then the remaining fingers hold again for the next round.
 * result   – one finger is left; the round is over and the bill is shown.
 */
export type Phase = 'idle' | 'spinning' | 'safe' | 'result';


export type SplitMode = 'one-pays' | 'weighted';


export type GameMode = 'bill' | 'first' | 'hot';

export type RoundRecord = {
  id: string;
  at: number;
  mode: GameMode;
  players: number;
  winnerOrder: number;
  winnerColor: string;
  amount: number | null;
};

export type Settings = {
  gameMode: GameMode;
  /** Players required to start. `null` means "at least 2, any number". */
  exactPlayers: number | null;
  /** How long every finger must stay still before the pick runs. */
  holdMs: number;
  /** Symbol prefixed to money amounts. */
  currency: string;
  /** Who pays: one unlucky player, or a weighted split for everyone. */
  splitMode: SplitMode;
  /** Play sound effects during the spin and the results. */
  sound: boolean;
  /** Fire haptic feedback during the spin and the results. */
  haptics: boolean;
};
