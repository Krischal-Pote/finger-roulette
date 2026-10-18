import { StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '../lib/money';
import type { Finger } from '../types';

type Props = {
  winner: Finger | null;
  playerCount: number;
  perPerson: number | null;
  currency: string;
};

/** The card shown once a finger has been picked. */
export function ResultBanner({
  winner,
  playerCount,
  perPerson,
  currency,
}: Props) {
  if (!winner) {
    return null;
  }

  const payers = Math.max(0, playerCount - 1);

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={[styles.card, { borderColor: winner.color }]}>
        <Text style={styles.kicker}>THE BILL IS ON</Text>
        <Text style={[styles.big, { color: winner.color }]}>
          Finger #{winner.order}
        </Text>
        <Text style={styles.free}>doesn&apos;t pay 🎉</Text>

        <View style={styles.divider} />

        {perPerson !== null ? (
          <>
            <Text style={styles.split}>
              {payers} other{payers === 1 ? '' : 's'} pay{' '}
              {formatMoney(perPerson, currency)} each
            </Text>
            <Text style={styles.splitHint}>
              {playerCount} people · {formatMoney(perPerson * payers, currency)}{' '}
              bill
            </Text>
          </>
        ) : (
          <Text style={styles.splitHint}>
            Type the bill total above to see what each person owes.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 24,
    paddingTop: 22,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: 'rgba(8,8,12,0.92)',
    paddingVertical: 20,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  kicker: {
    color: '#8B8B96',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.5,
  },
  big: {
    marginTop: 8,
    fontSize: 40,
    fontWeight: '900',
  },
  free: {
    color: '#F4F4F6',
    fontSize: 22,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    width: '70%',
    marginVertical: 16,
    backgroundColor: '#26262E',
  },
  split: {
    color: '#F4F4F6',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  splitHint: {
    marginTop: 8,
    color: '#8B8B96',
    fontSize: 13,
    textAlign: 'center',
  },
});
