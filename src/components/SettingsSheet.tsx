import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  CURRENCY_OPTIONS,
  HOLD_OPTIONS,
  MIN_PLAYERS,
  modeLabel,
  PLAYER_OPTIONS,
  SPLIT_OPTIONS,
} from '../constants';
import { formatMoney, weightedShares } from '../lib/money';
import type { RoundRecord, Settings } from '../types';

type Props = {
  visible: boolean;
  settings: Settings;
  maxSeen: number;
  history: RoundRecord[];
  onChange: (patch: Partial<Settings>) => void;
  onClearHistory: () => void;
  onClose: () => void;
};

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Shows a concrete example of the split with the current settings. */
function SplitPreview({ settings }: { settings: Settings }) {
  const example = 1000;
  const players = 4;
  const shares = weightedShares(example, players);

  return (
    <View style={styles.preview}>
      <Text style={styles.previewTitle}>
        Example · {formatMoney(example, settings.currency)} between {players}
      </Text>
      {settings.splitMode === 'weighted' ? (
        shares.map((share, index) => (
          <View key={index} style={styles.previewRow}>
            <Text style={styles.previewName}>
              #{index + 1} picked
              {index === players - 1 ? ' (last)' : ''}
            </Text>
            <Text style={styles.previewAmount}>
              {formatMoney(share, settings.currency)}
            </Text>
          </View>
        ))
      ) : (
        <View style={styles.previewRow}>
          <Text style={styles.previewName}>Last finger left</Text>
          <Text style={styles.previewAmount}>
            {formatMoney(example, settings.currency)}
          </Text>
        </View>
      )}
    </View>
  );
}

/** Compact timestamp without relying on Intl support in the JS engine. */
function formatWhen(at: number): string {
  const date = new Date(at);
  const now = new Date();
  if (date.toDateString() !== now.toDateString()) {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
  const hours = date.getHours();
  const suffix = hours < 12 ? 'AM' : 'PM';
  const hour = hours % 12 || 12;
  return `${hour}:${String(date.getMinutes()).padStart(2, '0')} ${suffix}`;
}

export function SettingsSheet({
  visible,
  settings,
  maxSeen,
  history,
  onChange,
  onClearHistory,
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>
              Tap an option to change it. Everything is optional the game
              works fine with the defaults.
            </Text>

            <Text style={styles.groupLabel}>Who pays?</Text>
            <Text style={styles.groupHint}>
              Pick how the bill is shared once the draw is over.
            </Text>
            <View style={styles.stack}>
              {SPLIT_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => onChange({ splitMode: option.value })}
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected: settings.splitMode === option.value,
                  }}
                  style={[
                    styles.option,
                    settings.splitMode === option.value && styles.optionSelected,
                  ]}
                >
                  <View style={styles.optionText}>
                    <Text
                      style={[
                        styles.optionTitle,
                        settings.splitMode === option.value &&
                          styles.optionTitleSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.optionHint}>{option.short}</Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      settings.splitMode === option.value && styles.radioOn,
                    ]}
                  />
                </Pressable>
              ))}
            </View>

            <SplitPreview settings={settings} />

            <Text style={styles.groupLabel}>Players</Text>
            <Text style={styles.groupHint}>
              {settings.exactPlayers === null
                ? `Auto: starts with ${MIN_PLAYERS} or more fingers, so nobody has to wait for a late friend.`
                : `Everyone must be in: the game waits for exactly ${settings.exactPlayers} fingers.`}
            </Text>
            <View style={styles.row}>
              {PLAYER_OPTIONS.map((option) => (
                <Chip
                  key={String(option)}
                  label={option === null ? 'Auto' : String(option)}
                  selected={settings.exactPlayers === option}
                  onPress={() => onChange({ exactPlayers: option })}
                />
              ))}
            </View>

            <Text style={styles.groupLabel}>Hold time</Text>
            <Text style={styles.groupHint}>
              How long every finger must stay still before the pick runs. Longer
              gives slow hands more time.
            </Text>
            <View style={styles.row}>
              {HOLD_OPTIONS.map((option) => (
                <Chip
                  key={option.ms}
                  label={option.label}
                  selected={settings.holdMs === option.ms}
                  onPress={() => onChange({ holdMs: option.ms })}
                />
              ))}
            </View>

            <Text style={styles.groupLabel}>Currency</Text>
            <Text style={styles.groupHint}>
              Symbol shown in front of money amounts.
            </Text>
            <View style={styles.row}>
              {CURRENCY_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  selected={settings.currency === option}
                  onPress={() => onChange({ currency: option })}
                />
              ))}
            </View>

            <Text style={styles.groupLabel}>Feedback</Text>
            <Text style={styles.groupHint}>
              Sound effects and vibration during the spin and the results.
            </Text>
            <View style={styles.row}>
              <Chip
                label={settings.sound ? 'Sound on' : 'Sound off'}
                selected={settings.sound}
                onPress={() => onChange({ sound: !settings.sound })}
              />
              <Chip
                label={settings.haptics ? 'Vibration on' : 'Vibration off'}
                selected={settings.haptics}
                onPress={() => onChange({ haptics: !settings.haptics })}
              />
            </View>

            <Text style={styles.groupLabel}>Recent rounds</Text>
            <View style={styles.historyHeader}>
              <Text style={styles.groupHint}>
                The last draws, saved on this device.
              </Text>
              {history.length > 0 ? (
                <Pressable onPress={onClearHistory} hitSlop={10}>
                  <Text style={styles.clearHistory}>Clear</Text>
                </Pressable>
              ) : null}
            </View>
            {history.length === 0 ? (
              <Text style={styles.emptyHistory}>
                Nothing yet. Finish a round and it shows up here.
              </Text>
            ) : (
              <View style={styles.historyList}>
                {history.slice(0, 6).map((record) => (
                  <View key={record.id} style={styles.historyRow}>
                    <View
                      style={[
                        styles.historyDot,
                        { backgroundColor: record.winnerColor },
                      ]}
                    />
                    <View style={styles.historyText}>
                      <Text style={styles.historyTitle}>
                        {modeLabel(record.mode)} · Finger #{record.winnerOrder}
                      </Text>
                      <Text style={styles.historyMeta}>
                        {record.players} players · {formatWhen(record.at)}
                      </Text>
                    </View>
                    {record.amount !== null ? (
                      <Text style={styles.historyAmount}>
                        {formatMoney(record.amount, settings.currency)}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.info}>
              {maxSeen > 0
                ? `This device has reported up to ${maxSeen} fingers at once.`
                : 'Touch screen reports every finger you place on it.'}{' '}
              The hardware sets the limit (many phones handle 5, tablets up to
              10), so keep one finger per person.
            </Text>
          </ScrollView>

          <Pressable style={styles.done} onPress={onClose}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  backdropFill: {
    flex: 1,
  },
  sheet: {
    maxHeight: '86%',
    backgroundColor: '#111117',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 26,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A3A46',
    marginBottom: 14,
  },
  title: {
    color: '#F4F4F6',
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    color: '#7C7C88',
    fontSize: 13,
    lineHeight: 18,
  },
  groupLabel: {
    marginTop: 20,
    color: '#F4F4F6',
    fontSize: 15,
    fontWeight: '700',
  },
  groupHint: {
    marginTop: 4,
    color: '#7C7C88',
    fontSize: 12,
    lineHeight: 17,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  stack: {
    gap: 8,
    marginTop: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2C2C36',
    backgroundColor: '#17171E',
  },
  optionSelected: {
    borderColor: '#4ADE80',
    backgroundColor: 'rgba(74,222,128,0.12)',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    color: '#F4F4F6',
    fontSize: 15,
    fontWeight: '700',
  },
  optionTitleSelected: {
    color: '#4ADE80',
  },
  optionHint: {
    marginTop: 3,
    color: '#8B8B96',
    fontSize: 12,
    lineHeight: 17,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3A3A46',
  },
  radioOn: {
    borderColor: '#4ADE80',
    backgroundColor: '#4ADE80',
  },
  preview: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#0B0B10',
    borderWidth: 1,
    borderColor: '#1F1F27',
  },
  previewTitle: {
    color: '#8B8B96',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  previewName: {
    color: '#B9B9C4',
    fontSize: 13,
  },
  previewAmount: {
    color: '#F4F4F6',
    fontSize: 13,
    fontWeight: '700',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C36',
    backgroundColor: '#17171E',
  },
  chipSelected: {
    borderColor: '#4ADE80',
    backgroundColor: 'rgba(74,222,128,0.16)',
  },
  chipText: {
    color: '#A8A8B4',
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#4ADE80',
  },
  info: {
    marginTop: 22,
    color: '#6B6B76',
    fontSize: 12,
    lineHeight: 18,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  clearHistory: {
    marginTop: 4,
    color: '#FF8A8A',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyHistory: {
    marginTop: 10,
    color: '#6B6B76',
    fontSize: 12,
    fontStyle: 'italic',
  },
  historyList: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F1F27',
    backgroundColor: '#0B0B10',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  historyText: {
    flex: 1,
  },
  historyTitle: {
    color: '#D4D4DC',
    fontSize: 13,
    fontWeight: '600',
  },
  historyMeta: {
    marginTop: 2,
    color: '#6B6B76',
    fontSize: 11,
  },
  historyAmount: {
    color: '#F4F4F6',
    fontSize: 13,
    fontWeight: '700',
  },
  done: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: '#4ADE80',
    paddingVertical: 15,
    alignItems: 'center',
  },
  doneText: {
    color: '#04220F',
    fontSize: 16,
    fontWeight: '800',
  },
});
