import { StyleSheet, Text, View } from 'react-native';

import { formatMoney, weightedShares } from '../lib/money';
import type { Finger, GameMode, SplitMode } from '../types';

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

function ordinal(index: number): string {
  return ORDINALS[index] ?? `${index + 1}th`;
}

type Props = {
  mode: GameMode;
  winner: Finger | null;
  /** Fingers in the order the roulette picked them (the winner is not in here). */
  picked: Finger[];
  playerCount: number;
  bill: number | null;
  currency: string;
  splitMode: SplitMode;
};

export function ResultBanner({
  mode,
  winner,
  picked,
  playerCount,
  bill,
  currency,
  splitMode,
}: Props) {
  if (!winner) {
    return null;
  }

  if (mode !== 'bill') {
    const isHot = mode === 'hot';
    const others = Math.max(0, playerCount - 1);

    return (
      <View pointerEvents="none" style={styles.wrap}>
        <View style={[styles.card, { borderColor: winner.color }]}>
          <Text style={styles.kicker}>
            {isHot ? 'HOT FINGER' : 'WHO GOES FIRST?'}
          </Text>
          <Text style={[styles.big, { color: winner.color }]}>
            Finger #{winner.order}
          </Text>
          <Text style={styles.free}>
            {isHot ? 'got burned 🔥' : 'goes first 🎉'}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.splitHint}>
            {isHot
              ? 'Play again to burn someone else.'
              : `${others} other${others === 1 ? '' : 's'} can relax.`}
          </Text>
        </View>
      </View>
    );
  }

  // Weighted mode: the last finger left was picked last, so it pays the most.
  const order = [...picked, winner].filter(
    (finger, index, list) =>
      list.findIndex((item) => item.id === finger.id) === index,
  );
  const shares = bill !== null ? weightedShares(bill, order.length) : [];
  const safeCount = Math.max(0, playerCount - 1);

  if (splitMode === 'weighted') {
    return (
      <View pointerEvents="none" style={styles.wrap}>
        <View style={[styles.card, { borderColor: winner.color }]}>
          <Text style={styles.kicker}>SPLIT BY LUCK</Text>
          <Text style={styles.free}>Everyone pays a share</Text>
          <Text style={styles.splitHint}>
            First picked pays the least · last picked pays the most
          </Text>

          <View style={styles.divider} />

          {bill !== null ? (
            <>
              {order.map((finger, index) => (
                <View key={finger.id} style={styles.line}>
                  <View style={styles.lineLeft}>
                    <View
                      style={[styles.dot, { backgroundColor: finger.color }]}
                    />
                    <Text style={styles.lineOrder}>{ordinal(index)}</Text>
                    <Text style={styles.lineName}>Finger #{finger.order}</Text>
                  </View>
                  <Text
                    style={[
                      styles.lineAmount,
                      index === order.length - 1 && { color: finger.color },
                    ]}
                  >
                    {formatMoney(shares[index], currency)}
                  </Text>
                </View>
              ))}
              <Text style={styles.total}>
                Total {formatMoney(bill, currency)}
              </Text>
            </>
          ) : (
            <Text style={styles.splitHint}>
              Type the bill total above to see each share.
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={[styles.card, { borderColor: winner.color }]}>
        <Text style={styles.kicker}>THE BILL IS ON</Text>
        <Text style={[styles.big, { color: winner.color }]}>
          Finger #{winner.order}
        </Text>
        <Text style={styles.free}>pays it all 💸</Text>

        <View style={styles.divider} />

        {bill !== null ? (
          <>
            <Text style={styles.split}>
              They owe {formatMoney(bill, currency)}
            </Text>
            <Text style={styles.splitHint}>
              {safeCount} other{safeCount === 1 ? '' : 's'} got lucky and pay
              nothing.
            </Text>
          </>
        ) : (
          <Text style={styles.splitHint}>
            Type the bill total above to see how much they owe.
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
  line: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  lineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  lineName: {
    color: '#D4D4DC',
    fontSize: 15,
    fontWeight: '600',
  },
  lineOrder: {
    color: '#6B6B76',
    fontSize: 12,
    fontWeight: '700',
    width: 26,
  },
  lineAmount: {
    color: '#F4F4F6',
    fontSize: 15,
    fontWeight: '800',
  },
  total: {
    marginTop: 10,
    color: '#6B6B76',
    fontSize: 12,
    fontWeight: '600',
  },
});
