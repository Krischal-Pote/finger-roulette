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
  PLAYER_OPTIONS,
} from '../constants';
import type { Settings } from '../types';

type Props = {
  visible: boolean;
  settings: Settings;
  maxSeen: number;
  onChange: (patch: Partial<Settings>) => void;
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
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SettingsSheet({
  visible,
  settings,
  maxSeen,
  onChange,
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

            <Text style={styles.groupLabel}>Players</Text>
            <Text style={styles.groupHint}>
              Auto starts with {MIN_PLAYERS}+ fingers. Pick a number to require
              everyone at once.
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
              How long every finger must stay still before the pick runs.
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
    maxHeight: '82%',
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
    marginBottom: 8,
  },
  groupLabel: {
    marginTop: 18,
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
