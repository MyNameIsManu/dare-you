import { type ReactNode, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Colors of an outgoing ("sent") chat message, for light and dark mode. */
export const BubbleColors = {
  light: { background: '#D9FDD3', text: '#111B21', meta: '#667781', ticks: '#53BDEB' },
  dark: { background: '#005C4B', text: '#E9EDEF', meta: '#AEBAC1', ticks: '#53BDEB' },
} as const;

export function useBubbleColors() {
  const scheme = useColorScheme();
  return BubbleColors[scheme === 'dark' ? 'dark' : 'light'];
}

const TAIL_WIDTH = 10;
const TAIL_HEIGHT = 14;

function formatTime(date: Date) {
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/** A right-aligned "sent message" speech bubble with a tail, timestamp and read ticks. */
export function ChatBubble({ children }: { children: ReactNode }) {
  const colors = useBubbleColors();
  const [time] = useState(() => formatTime(new Date()));

  return (
    <View style={styles.row}>
      <View style={[styles.bubble, { backgroundColor: colors.background }]}>
        {children}
        <View style={styles.meta}>
          <Text style={[styles.metaText, { color: colors.meta }]}>{time}</Text>
          <Text style={[styles.ticks, { color: colors.ticks }]}>✓✓</Text>
        </View>
        {/* Tail: a triangle flush with the bubble's top-right corner */}
        <View style={[styles.tail, { borderTopColor: colors.background }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'stretch',
    alignItems: 'flex-end',
    paddingRight: TAIL_WIDTH,
  },
  bubble: {
    width: '92%',
    borderRadius: 12,
    borderTopRightRadius: 0,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
    boxShadow: '0 1px 1px rgba(11, 20, 26, 0.13)',
  },
  meta: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    alignItems: 'center',
    gap: Spacing.one,
  },
  metaText: {
    fontSize: 11,
    lineHeight: 16,
  },
  ticks: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: -3,
    marginRight: 3,
  },
  tail: {
    position: 'absolute',
    top: 0,
    right: -TAIL_WIDTH,
    width: 0,
    height: 0,
    borderTopWidth: TAIL_HEIGHT,
    borderRightWidth: TAIL_WIDTH,
    borderRightColor: 'transparent',
  },
});
