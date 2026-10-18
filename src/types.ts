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
 * result   – a finger has been picked (touches ignored, winner frozen)
 */
export type Phase = 'idle' | 'spinning' | 'result';

export type Settings = {
  /** Players required to start. `null` means "at least 2, any number". */
  exactPlayers: number | null;
  /** How long every finger must stay still before the pick runs. */
  holdMs: number;
  /** Symbol prefixed to money amounts. */
  currency: string;
};
