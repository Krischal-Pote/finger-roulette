import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { FingerRing } from './src/components/FingerRing';
import { ResultBanner } from './src/components/ResultBanner';
import { SettingsSheet } from './src/components/SettingsSheet';
import { StatusOverlay } from './src/components/StatusOverlay';
import { DEFAULT_SETTINGS, MIN_PLAYERS, SAFE_PAUSE_MS } from './src/constants';
import { useMultiTouch } from './src/hooks/useMultiTouch';
import {
  hapticImpact,
  hapticResult,
  hapticTick,
} from './src/lib/haptics';
import { formatMoney, parseAmount } from './src/lib/money';
import { pickRandomIndex } from './src/lib/random';
import type { RingMode } from './src/components/FingerRing';
import type { Finger, Phase, Settings } from './src/types';

/** Roulette feel: how many rings to hop, first delay, and the slowdown per hop. */
const SPIN_STEPS = 22;
const SPIN_FIRST_DELAY_MS = 40;
const SPIN_SLOWDOWN = 1.1;
const TICK_MS = 50;

type Player = ReturnType<typeof useAudioPlayer>;

/** Restart a one-shot sound from the beginning. */
function replay(player: Player) {
  player.seekTo(0);
  player.play();
}

function Game() {
  // Nobody should have to hold the screen awake with a finger.
  useKeepAwake();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<Phase>('idle');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [billText, setBillText] = useState('');
  const [progress, setProgress] = useState(0);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [winner, setWinner] = useState<Finger | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [maxSeen, setMaxSeen] = useState(0);
  // Touch ids that have already been picked out of the running ("safe").
  const [eliminated, setEliminated] = useState<number[]>([]);
  // Label of the finger picked in the last round, for the "safe" banner.
  const [safeOrder, setSafeOrder] = useState<number | null>(null);
  // How many players started the round, so the result can say "N got lucky".
  const [rosterSize, setRosterSize] = useState(0);

  // Short sound effects, generated in scripts/generate-sounds.js.
  const tickPlayer = useAudioPlayer(require('./assets/sounds/tick.wav'));
  const safePlayer = useAudioPlayer(require('./assets/sounds/safe.wav'));
  const payPlayer = useAudioPlayer(require('./assets/sounds/pay.wav'));

  // Latest settings + sounds, read inside the spin timer without re-creating it
  // (re-creating startSpin would restart the hold countdown mid-round).
  const settingsRef = useRef(settings);
  const soundsRef = useRef({ tick: tickPlayer, safe: safePlayer, pay: payPlayer });
  useEffect(() => {
    settingsRef.current = settings;
    soundsRef.current = { tick: tickPlayer, safe: safePlayer, pay: payPlayer };
  });

  // Keep game sounds audible even when the phone is on silent (iOS).
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  // Fingers are only read while collecting. During the spin and between rounds
  // the set is frozen, so the pick can never change under the players.
  const interactive = phase === 'idle' && !settingsOpen;
  const { fingers, surfaceRef, measureSurface, resetFingers, touchHandlers } =
    useMultiTouch(interactive);

  const fingersRef = useRef<Finger[]>(fingers);
  useEffect(() => {
    fingersRef.current = fingers;
    setMaxSeen((prev) => Math.max(prev, fingers.length));
  }, [fingers]);

  // Elimination is tracked by touch id, so a picked finger stays out even while
  // the player is still lifting their hand.
  const eliminatedRef = useRef<number[]>([]);
  useEffect(() => {
    eliminatedRef.current = eliminated;
  }, [eliminated]);

  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startSpin = useCallback(() => {
    const eliminatedIds = eliminatedRef.current;
    // Only fingers still in the running can be picked.
    const list = fingersRef.current.filter(
      (finger) => !eliminatedIds.includes(finger.id),
    );
    if (list.length < MIN_PLAYERS) {
      return;
    }

    const { sound, haptics } = settingsRef.current;
    const sounds = soundsRef.current;

    const total = list.length;
    const targetIndex = pickRandomIndex(total);
    const target = list[targetIndex];

    if (haptics) {
      hapticImpact();
    }
    setPhase('spinning');
    setProgress(0);

    let step = 0;
    let delay = SPIN_FIRST_DELAY_MS;

    const tick = () => {
      // Walk the rings and land exactly on the drawn finger.
      const index =
        (((targetIndex - (SPIN_STEPS - 1) + step) % total) + total) % total;
      setHighlightId(list[index].id);
      if (step > 0) {
        if (haptics) {
          hapticTick();
        }
        if (sound) {
          replay(sounds.tick);
        }
      }
      step += 1;

      if (step >= SPIN_STEPS) {
        setHighlightId(null);
        setSafeOrder(target.order);
        setRosterSize((prev) => (prev === 0 ? total : prev));
        setEliminated([...eliminatedIds, target.id]);

        const remaining = list.filter((finger) => finger.id !== target.id);
        if (remaining.length <= 1) {
          setWinner(remaining[0] ?? target);
          setPhase('result');
          if (sound) {
            replay(sounds.pay);
          }
          if (haptics) {
            hapticResult(false);
          }
        } else {
          // They're safe. Show it, then let the rest hold again.
          setPhase('safe');
          if (sound) {
            replay(sounds.safe);
          }
          if (haptics) {
            hapticResult(true);
          }
          safeTimer.current = setTimeout(() => {
            setPhase('idle');
          }, SAFE_PAUSE_MS);
        }
        return;
      }

      delay *= SPIN_SLOWDOWN;
      spinTimer.current = setTimeout(tick, delay);
    };

    tick();
  }, []);

  useEffect(() => {
    return () => {
      if (spinTimer.current) {
        clearTimeout(spinTimer.current);
      }
      if (safeTimer.current) {
        clearTimeout(safeTimer.current);
      }
    };
  }, []);

  const activeFingers = fingers.filter(
    (finger) => !eliminated.includes(finger.id),
  );
  const started = eliminated.length > 0 || winner !== null;
  const required = settings.exactPlayers ?? MIN_PLAYERS;
  const minNeeded = started ? MIN_PLAYERS : required;
  const countOk = activeFingers.length >= minNeeded;
  const exactOk =
    started ||
    settings.exactPlayers === null ||
    activeFingers.length === settings.exactPlayers;
  const holding = phase === 'idle' && countOk && exactOk;
  const fingerKey = activeFingers.map((finger) => finger.id).join('|');

  // The hold countdown restarts whenever the group changes - someone joining
  // late or lifting a finger. Wiggling in place does not reset it.
  useEffect(() => {
    if (!holding) {
      setProgress(0);
      return;
    }

    const startedAt = Date.now();
    const id = setInterval(() => {
      const value = Math.min(1, (Date.now() - startedAt) / settings.holdMs);
      setProgress(value);
      if (value >= 1) {
        clearInterval(id);
        startSpin();
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, [holding, fingerKey, settings.holdMs, startSpin]);

  const playAgain = useCallback(() => {
    if (spinTimer.current) {
      clearTimeout(spinTimer.current);
      spinTimer.current = null;
    }
    if (safeTimer.current) {
      clearTimeout(safeTimer.current);
      safeTimer.current = null;
    }
    setPhase('idle');
    setWinner(null);
    setHighlightId(null);
    setSafeOrder(null);
    setEliminated([]);
    setRosterSize(0);
    setProgress(0);
    resetFingers();
  }, [resetFingers]);

  const bill = parseAmount(billText);

  const modeOf = (finger: Finger): RingMode => {
    if (phase === 'result' && winner?.id === finger.id) {
      return 'winner';
    }
    if (eliminated.includes(finger.id)) {
      return 'safe';
    }
    if (phase === 'spinning' && finger.id === highlightId) {
      return 'highlight';
    }
    return 'idle';
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.billBox}>
          <Text style={styles.billCurrency}>{settings.currency}</Text>
          <TextInput
            value={billText}
            onChangeText={setBillText}
            placeholder="Bill total (optional)"
            placeholderTextColor="#5A5A66"
            keyboardType="decimal-pad"
            style={styles.billInput}
            editable={phase !== 'spinning'}
          />
          {billText.length > 0 ? (
            <Pressable onPress={() => setBillText('')} hitSlop={12}>
              <Text style={styles.clear}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          style={styles.settingsButton}
          onPress={() => setSettingsOpen(true)}
          hitSlop={8}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>
      </View>

      <View
        ref={surfaceRef}
        style={styles.surface}
        onLayout={measureSurface}
        {...touchHandlers}
      >
        {fingers.map((finger) => (
          <FingerRing key={finger.id} finger={finger} mode={modeOf(finger)} />
        ))}

        <StatusOverlay
          phase={phase}
          count={activeFingers.length}
          required={minNeeded}
          exactPlayers={started ? null : settings.exactPlayers}
          holding={holding}
          progress={progress}
          holdMs={settings.holdMs}
          safeOrder={safeOrder}
        />

        {phase === 'result' ? (
          <ResultBanner
            winner={winner}
            playerCount={rosterSize}
            bill={bill}
            currency={settings.currency}
          />
        ) : null}
      </View>

      {phase === 'result' ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
          <Pressable style={styles.primary} onPress={playAgain}>
            <Text style={styles.primaryText}>Play again</Text>
          </Pressable>
        </View>
      ) : null}

      <SettingsSheet
        visible={settingsOpen}
        settings={settings}
        maxSeen={maxSeen}
        onChange={(patch) => {
          if (patch.haptics === true && !settings.haptics) {
            hapticImpact();
          }
          setSettings((prev) => ({ ...prev, ...patch }));
        }}
        onClose={() => setSettingsOpen(false)}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Game />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#07070B',
  },
  billBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#22222B',
    backgroundColor: '#101016',
  },
  billCurrency: {
    color: '#8B8B96',
    fontSize: 16,
    fontWeight: '700',
  },
  billInput: {
    flex: 1,
    color: '#F4F4F6',
    fontSize: 16,
    padding: 0,
  },
  clear: {
    color: '#6B6B76',
    fontSize: 15,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#22222B',
    backgroundColor: '#101016',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    color: '#A8A8B4',
    fontSize: 18,
  },
  surface: {
    flex: 1,
    backgroundColor: '#000000',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#07070B',
  },
  primary: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ADE80',
  },
  primaryText: {
    color: '#04220F',
    fontSize: 17,
    fontWeight: '800',
  },
});
