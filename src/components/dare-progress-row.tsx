import { Pressable, StyleSheet, View } from "react-native";

import {
  UrgencyColors,
  dareProgress,
  formatRemaining,
} from "@/../utils/dare-progress";
import type { Dare } from "@/../utils/dares";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type Props = {
  dare: Dare;
  now: number;
  onPress: () => void;
};

/** One dare with a bar: how much of its time is used up. */
export function DareProgressRow({ dare, now, onPress }: Props) {
  const theme = useTheme();
  const inReview = dare.status === "submitted";
  const progress = dareProgress(dare, now);
  const color = UrgencyColors[progress.urgency];

  // Under 48 h left the day count says little, show the time left instead
  const label =
    progress.remainingMs < 2 * 24 * 60 * 60 * 1000
      ? `noch ${formatRemaining(progress.remainingMs)}`
      : `Tag ${progress.daysPassed} / ${progress.daysTotal}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.header}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
            {dare.title}
          </ThemedText>
          {inReview ? (
            <ThemedView type="backgroundSelected" style={styles.badge}>
              <ThemedText type="small" themeColor="textSecondary">
                In Prüfung
              </ThemedText>
            </ThemedView>
          ) : (
            <ThemedText type="small" style={{ color }}>
              {label}
            </ThemedText>
          )}
        </View>

        {/* Proof is in: the clock no longer matters */}
        {!inReview && (
          <View
            style={[
              styles.track,
              { backgroundColor: theme.backgroundSelected },
            ]}
          >
            <View
              style={[
                styles.fill,
                { width: `${progress.elapsed * 100}%`, backgroundColor: color },
              ]}
            />
          </View>
        )}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
});
