import { StyleSheet, Text, View } from 'react-native';

import type { Finger } from '../types';

export type RingMode = 'idle' | 'highlight' | 'winner' | 'dim';

const RADIUS = 44;

type Props = {
  finger: Finger;
  mode: RingMode;
};

/** The coloured circle drawn under one fingertip. */
export function FingerRing({ finger, mode }: Props) {
  const size = RADIUS * 2;
  const isWinner = mode === 'winner';

  return (
    <View
      pointerEvents="none"
      style={[
        styles.ring,
        {
          left: finger.x - RADIUS,
          top: finger.y - RADIUS,
          width: size,
          height: size,
          borderRadius: RADIUS,
          borderColor: finger.color,
          borderWidth: isWinner ? 9 : 6,
          backgroundColor: `${finger.color}${isWinner ? '66' : '1f'}`,
          opacity: mode === 'dim' ? 0.22 : 1,
          transform: [
            { scale: isWinner ? 1.35 : mode === 'highlight' ? 1.18 : 1 },
          ],
        },
        isWinner && styles.winnerGlow,
      ]}
    >
      <Text style={[styles.label, { color: finger.color }]}>
        {finger.order}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerGlow: {
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  label: {
    fontSize: 22,
    fontWeight: '800',
    textShadowColor: '#000000',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
});
