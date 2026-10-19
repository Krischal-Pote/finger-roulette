import { StyleSheet, Text, View } from 'react-native';

import type { Phase, SplitMode } from '../types';

type Props = {
  phase: Phase;
  count: number;
  required: number;
  exactPlayers: number | null;
  holding: boolean;
  progress: number;
  holdMs: number;
  safeOrder: number | null;
  splitMode: SplitMode;
};

/** The instruction / countdown text shown above the fingers, on the black surface. */
export function StatusOverlay({
  phase,
  count,
  required,
  exactPlayers,
  holding,
  progress,
  holdMs,
  safeOrder,
  splitMode,
}: Props) {
  if (phase === 'result') {
    return null;
  }

  let title: string;
  let subtitle: string | null = null;

  if (phase === 'safe') {
    title =
      safeOrder !== null
        ? splitMode === 'weighted'
          ? `Finger #${safeOrder} picked`
          : `Finger #${safeOrder} is safe`
        : splitMode === 'weighted'
          ? 'Picked!'
          : 'Safe!';
    subtitle = `${count} finger${count === 1 ? '' : 's'} left. Lift yours, the rest keep holding.`;
  } else if (phase === 'spinning') {
    title = 'Choosing…';
    subtitle = 'Fingers off! Keep holding.';
  } else if (
    exactPlayers !== null &&
    count > 0 &&
    count !== exactPlayers
  ) {
    title = `Waiting for exactly ${exactPlayers} players`;
    subtitle = `${count} finger${count === 1 ? '' : 's'} on the screen`;
  } else if (count === 0) {
    title = 'Everyone put one finger on the screen';
    subtitle = 'Hold still until the countdown finishes.';
  } else if (count < required) {
    title = `Waiting for more fingers (${count}/${required})`;
    subtitle = 'At least two fingers are needed.';
  } else if (holding) {
    title = 'Hold still…';
    subtitle = `${Math.ceil((1 - progress) * (holdMs / 1000))}s`;
  } else {
    title = `${count} finger${count === 1 ? '' : 's'} in`;
    subtitle =
      splitMode === 'weighted'
        ? 'Get set. First picked pays least, last pays most.'
        : 'Get set.';
  }

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {holding ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 28,
    paddingTop: 26,
    alignItems: 'center',
  },
  title: {
    color: '#F4F4F6',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    color: '#8B8B96',
    fontSize: 14,
    textAlign: 'center',
  },
  track: {
    marginTop: 16,
    height: 6,
    width: 220,
    borderRadius: 3,
    backgroundColor: '#26262E',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
});
