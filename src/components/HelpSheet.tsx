import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
};

const STEPS: { icon: string; title: string; body: string }[] = [
  {
    icon: '1',
    title: 'Pick a mode',
    body: 'Bill split decides who pays. Who first? and Hot finger use the same fair draw for any decision or party game.',
  },
  {
    icon: '2',
    title: 'Everyone puts one finger down',
    body: 'All players touch the black area at the same time, one finger each. The coloured rings show who is in.',
  },
  {
    icon: '3',
    title: 'Hold still',
    body: 'A green bar fills up. If anyone lifts or joins, it simply restarts, so the whole group is always in the draw.',
  },
  {
    icon: '4',
    title: 'Watch the rings hop',
    body: 'One finger is picked at random. In Bill split the last finger left pays everything, and each safe finger holds again for the next round.',
  },
  {
    icon: '5',
    title: 'Hot finger (optional)',
    body: 'The rings hop faster and faster until one finger is lit: that one gets burned. One fast draw, no eliminations.',
  },
  {
    icon: '6',
    title: 'Split by luck (optional)',
    body: 'Turn this on in Settings for bill rounds and everyone pays a share: the first finger picked pays the least and the last pays the most.',
  },
];

export function HelpSheet({ visible, onClose, onOpenSettings }: Props) {
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
            <Text style={styles.title}>How to play</Text>
            <Text style={styles.subtitle}>
              No sign-up, no rules to learn. One finger each and you&apos;re ready.
            </Text>

            {STEPS.map((step) => (
              <View key={step.title} style={styles.step}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{step.icon}</Text>
                </View>
                <View style={styles.stepText}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepBody}>{step.body}</Text>
                </View>
              </View>
            ))}

            <View style={styles.tip}>
              <Text style={styles.tipTitle}>Good to know</Text>
              <Text style={styles.tipBody}>
                • The pick is random and fair, and finger position or colour never
                changes the odds.{'\n'}• A phone usually reads up to 5 fingers at
                once; a tablet up to 10.{'\n'}• Settings and the last 20 rounds are
                saved on this device.{'\n'}• Lift all hands to start a fresh round
                with new numbers.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={styles.secondary}
              onPress={onOpenSettings}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryText}>Settings</Text>
            </Pressable>
            <Pressable
              style={styles.primary}
              onPress={onClose}
              accessibilityRole="button"
            >
              <Text style={styles.primaryText}>Got it</Text>
            </Pressable>
          </View>
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
    maxHeight: '88%',
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
  step: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(74,222,128,0.16)',
    borderWidth: 1,
    borderColor: '#4ADE80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#4ADE80',
    fontSize: 14,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    color: '#F4F4F6',
    fontSize: 15,
    fontWeight: '700',
  },
  stepBody: {
    marginTop: 3,
    color: '#8B8B96',
    fontSize: 13,
    lineHeight: 19,
  },
  tip: {
    marginTop: 22,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#0B0B10',
    borderWidth: 1,
    borderColor: '#1F1F27',
  },
  tipTitle: {
    color: '#F4F4F6',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  tipBody: {
    color: '#8B8B96',
    fontSize: 12,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  secondary: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C36',
    backgroundColor: '#17171E',
  },
  secondaryText: {
    color: '#A8A8B4',
    fontSize: 16,
    fontWeight: '700',
  },
  primary: {
    flex: 2,
    borderRadius: 16,
    backgroundColor: '#4ADE80',
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryText: {
    color: '#04220F',
    fontSize: 16,
    fontWeight: '800',
  },
});
