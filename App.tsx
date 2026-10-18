import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { FingerRing } from './src/components/FingerRing';
import { ResultBanner } from './src/components/ResultBanner';
import { SettingsSheet } from './src/components/SettingsSheet';
import { StatusOverlay } from './src/components/StatusOverlay';
import { DEFAULT_SETTINGS, MIN_PLAYERS } from './src/constants';
import { useMultiTouch } from './src/hooks/useMultiTouch';
import { formatMoney, parseAmount } from './src/lib/money';
import { pickRandomIndex } from './src/lib/random';
import type { RingMode } from './src/components/FingerRing';
import type { Finger, Phase, Settings } from './src/types';

/** Roulette feel: how many rings to hop, first delay, and the slowdown per hop. */
const SPIN_STEPS = 22;
const SPIN_FIRST_DELAY_MS = 40;
const SPIN_SLOWDOWN = 1.1;
const TICK_MS = 50;

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

  // Fingers are only read while collecting. During the spin and on the result
  // the set is frozen, so the pick can never change under the players.
  const interactive = phase === 'idle' && !settingsOpen;
  const { fingers, surfaceRef, measureSurface, resetFingers, touchHandlers } =
    useMultiTouch(interactive);

  const fingersRef = useRef<Finger[]>(fingers);
  useEffect(() => {
    fingersRef.current = fingers;
    setMaxSeen((prev) => Math.max(prev, fingers.length));
  }, [fingers]);

  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startSpin = useCallback(() => {
    const list = fingersRef.current;
    if (list.length < MIN_PLAYERS) {
      return;
    }

    const total = list.length;
    // The winner is drawn up front and the animation only reveals it, so the
    // result cannot depend on how the rings happen to be laid out.
    const winnerIndex = pickRandomIndex(total);
    const target = list[winnerIndex];

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPhase('spinning');
    setProgress(0);

    let step = 0;
    let delay = SPIN_FIRST_DELAY_MS;

    const tick = () => {
      // Walk the rings and land exactly on the drawn finger.
      const index =
        (((winnerIndex - (SPIN_STEPS - 1) + step) % total) + total) % total;
      setHighlightId(list[index].id);
      if (step > 0) {
        Haptics.selectionAsync().catch(() => {});
      }
      step += 1;

      if (step >= SPIN_STEPS) {
        setWinner(target);
        setPhase('result');
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
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
    };
  }, []);

  const required = settings.exactPlayers ?? MIN_PLAYERS;
  const countOk = fingers.length >= required;
  const exactOk =
    settings.exactPlayers === null || fingers.length === settings.exactPlayers;
  const holding = phase === 'idle' && countOk && exactOk;
  const fingerKey = fingers.map((finger) => finger.id).join('|');

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
    setPhase('idle');
    setWinner(null);
    setHighlightId(null);
    setProgress(0);
    resetFingers();
  }, [resetFingers]);

  const bill = parseAmount(billText);
  const payers = Math.max(0, fingers.length - 1);
  const perPerson = bill !== null && payers > 0 ? bill / payers : null;

  const modeOf = (finger: Finger): RingMode => {
    if (phase === 'result') {
      return winner?.id === finger.id ? 'winner' : 'dim';
    }
    if (phase === 'spinning') {
      return finger.id === highlightId ? 'highlight' : 'idle';
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
          count={fingers.length}
          required={required}
          exactPlayers={settings.exactPlayers}
          holding={holding}
          progress={progress}
          holdMs={settings.holdMs}
        />

        {phase === 'result' ? (
          <ResultBanner
            winner={winner}
            playerCount={fingers.length}
            perPerson={perPerson}
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
        onChange={(patch) =>
          setSettings((prev) => ({ ...prev, ...patch }))
        }
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
