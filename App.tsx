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
import { HelpSheet } from './src/components/HelpSheet';
import { ModeBar } from './src/components/ModeBar';
import { ResultBanner } from './src/components/ResultBanner';
import { SettingsSheet } from './src/components/SettingsSheet';
import { StatusOverlay } from './src/components/StatusOverlay';
import {
  DEFAULT_SETTINGS,
  MIN_PLAYERS,
  MODE_OPTIONS,
  SAFE_PAUSE_MS,
} from './src/constants';
import { useMultiTouch } from './src/hooks/useMultiTouch';
import {
  hapticImpact,
  hapticResult,
  hapticTick,
} from './src/lib/haptics';
import { parseAmount } from './src/lib/money';
import { pickRandomIndex } from './src/lib/random';
import { HISTORY_LIMIT, loadAppState, markGuideShown, saveHistory, saveSettings } from './src/lib/storage';
import type { RingMode } from './src/components/FingerRing';
import type { Finger, GameMode, Phase, RoundRecord, Settings } from './src/types';

/** Roulette feel: how many rings to hop, first delay, and the slowdown per hop. */
const SPIN_STEPS = 22;
const SPIN_FIRST_DELAY_MS = 40;
const SPIN_SLOWDOWN = 1.1;
const TICK_MS = 50;

/** Hot finger: fast random hops, then a slowdown over the last few rings. */
const HOT_FIRST_DELAY_MS = 80;
const HOT_SLOWDOWN = 1.55;
const HOT_SLOW_STEPS = 6;

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
  const [history, setHistory] = useState<RoundRecord[]>([]);
  const [ready, setReady] = useState(false);
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
  // Fingers in the order they were picked. Used by the weighted split.
  const [picked, setPicked] = useState<Finger[]>([]);
  // The guide opens by itself only on the very first launch after install, then
  // lives behind the "?" button in the header.
  const [helpOpen, setHelpOpen] = useState(false);

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

  useEffect(() => {
    let alive = true;
    loadAppState().then((state) => {
      if (!alive) {
        return;
      }
      setSettings(state.settings);
      setHistory(state.history);
      if (!state.guideShown) {
        setHelpOpen(true);
        void markGuideShown();
      }
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (ready) {
      void saveSettings(settings);
    }
  }, [ready, settings]);

  useEffect(() => {
    if (ready) {
      void saveHistory(history);
    }
  }, [ready, history]);

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
  const rosterSizeRef = useRef(0);

  const billRef = useRef<number | null>(null);
  useEffect(() => {
    billRef.current = parseAmount(billText);
  }, [billText]);

  const recordRound = useCallback((finger: Finger, players: number) => {
    const mode = settingsRef.current.gameMode;
    const at = Date.now();
    const record: RoundRecord = {
      id: `${at}-${finger.order}-${Math.random().toString(36).slice(2, 6)}`,
      at,
      mode,
      players,
      winnerOrder: finger.order,
      winnerColor: finger.color,
      amount: mode === 'bill' ? billRef.current : null,
    };
    setHistory((prev) => [record, ...prev].slice(0, HISTORY_LIMIT));
  }, []);

  const startRound = useCallback(() => {
    const mode = settingsRef.current.gameMode;
    const eliminatedIds = eliminatedRef.current;
    // Only the bill game eliminates; the other modes are a single draw.
    const list =
      mode === 'bill'
        ? fingersRef.current.filter(
            (finger) => !eliminatedIds.includes(finger.id),
          )
        : fingersRef.current;
    if (list.length < MIN_PLAYERS) {
      return;
    }

    const { sound, haptics } = settingsRef.current;
    const sounds = soundsRef.current;

    const total = list.length;
    const targetIndex = pickRandomIndex(total);
    const target = list[targetIndex];
    const steps = mode === 'hot' ? 26 + pickRandomIndex(16) : SPIN_STEPS;

    if (mode === 'bill' && eliminatedIds.length === 0) {
      rosterSizeRef.current = total;
    }

    if (haptics) {
      hapticImpact();
    }
    setPhase('spinning');
    setProgress(0);

    let step = 0;
    let delay = mode === 'hot' ? HOT_FIRST_DELAY_MS : SPIN_FIRST_DELAY_MS;

    const tick = () => {
      // Walk the rings and land exactly on the drawn finger.
      const index =
        (((targetIndex - (steps - 1) + step) % total) + total) % total;
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

      if (step >= steps) {
        setHighlightId(null);

        if (mode !== 'bill') {
          setWinner(target);
          setRosterSize(total);
          setPhase('result');
          recordRound(target, total);
          if (sound) {
            replay(mode === 'hot' ? sounds.pay : sounds.safe);
          }
          if (haptics) {
            hapticResult(mode !== 'hot');
          }
          return;
        }

        setSafeOrder(target.order);
        setRosterSize((prev) => (prev === 0 ? total : prev));
        setEliminated([...eliminatedIds, target.id]);
        setPicked((prev) => [...prev, target]);

        const remaining = list.filter((finger) => finger.id !== target.id);
        if (remaining.length <= 1) {
          const loser = remaining[0] ?? target;
          setWinner(loser);
          setPhase('result');
          recordRound(loser, rosterSizeRef.current || total);
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

      if (mode === 'hot') {
        const remaining = steps - step;
        delay =
          remaining <= HOT_SLOW_STEPS
            ? 120 * Math.pow(HOT_SLOWDOWN, HOT_SLOW_STEPS - remaining)
            : HOT_FIRST_DELAY_MS + pickRandomIndex(45);
      } else {
        delay *= SPIN_SLOWDOWN;
      }
      spinTimer.current = setTimeout(tick, delay);
    };

    tick();
  }, [recordRound]);

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
        startRound();
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, [holding, fingerKey, settings.holdMs, startRound]);

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
    setPicked([]);
    setProgress(0);
    rosterSizeRef.current = 0;
    resetFingers();
  }, [resetFingers]);

  const changeMode = useCallback(
    (gameMode: GameMode) => {
      if (gameMode === settingsRef.current.gameMode) {
        return;
      }
      playAgain();
      setSettings((prev) => ({ ...prev, gameMode }));
    },
    [playAgain],
  );

  const clearHistory = useCallback(() => setHistory([]), []);

  const bill = parseAmount(billText);
  const modeOption = MODE_OPTIONS.find(
    (option) => option.value === settings.gameMode,
  );

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
        {settings.gameMode === 'bill' ? (
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
        ) : (
          <View style={styles.modeSummary}>
            <Text style={styles.modeTitle}>{modeOption?.label}</Text>
            <Text style={styles.modeHint} numberOfLines={1}>
              {modeOption?.hint}
            </Text>
          </View>
        )}

        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconButton}
            onPress={() => setHelpOpen(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="How to play"
          >
            <Text style={styles.helpIcon}>?</Text>
          </Pressable>
          <Pressable
            style={styles.iconButton}
            onPress={() => setSettingsOpen(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </Pressable>
        </View>
      </View>

      <ModeBar value={settings.gameMode} onChange={changeMode} />

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
          mode={settings.gameMode}
          phase={phase}
          count={activeFingers.length}
          required={minNeeded}
          exactPlayers={started ? null : settings.exactPlayers}
          holding={holding}
          progress={progress}
          holdMs={settings.holdMs}
          safeOrder={safeOrder}
          splitMode={settings.splitMode}
        />

        {phase === 'result' ? (
          <ResultBanner
            mode={settings.gameMode}
            winner={winner}
            picked={picked}
            playerCount={rosterSize}
            bill={settings.gameMode === 'bill' ? bill : null}
            currency={settings.currency}
            splitMode={settings.splitMode}
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
        history={history}
        onChange={(patch) => {
          if (patch.haptics === true && !settings.haptics) {
            hapticImpact();
          }
          setSettings((prev) => ({ ...prev, ...patch }));
        }}
        onClearHistory={clearHistory}
        onClose={() => setSettingsOpen(false)}
      />

      <HelpSheet
        visible={helpOpen}
        onClose={() => setHelpOpen(false)}
        onOpenSettings={() => {
          setHelpOpen(false);
          // Let the guide finish dismissing before presenting the settings
          // sheet - iOS will not stack two modals in the same frame.
          setTimeout(() => setSettingsOpen(true), 320);
        }}
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
  modeSummary: {
    flex: 1,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#22222B',
    backgroundColor: '#101016',
    justifyContent: 'center',
  },
  modeTitle: {
    color: '#F4F4F6',
    fontSize: 15,
    fontWeight: '700',
  },
  modeHint: {
    marginTop: 1,
    color: '#6B6B76',
    fontSize: 11,
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#22222B',
    backgroundColor: '#101016',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpIcon: {
    color: '#A8A8B4',
    fontSize: 18,
    fontWeight: '800',
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
