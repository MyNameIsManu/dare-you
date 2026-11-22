import { Pressable, StyleSheet, View } from "react-native";

import {
  UrgencyColors,
  dareProgress,
  progressLabel,
} from "@/../utils/dare-progress";
import type { Dare } from "@/../utils/dares";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { TimeProgressBar } from "@/components/time-progress-bar";
import { Spacing } from "@/constants/theme";
import { useI18n } from "@/i18n";

type Props = {
  dare: Dare;
  now: number;
  onPress: () => void;
};

/** One dare with a bar: how much of its time is used up. */
export function DareProgressRow({ dare, now, onPress }: Props) {
  const { t } = useI18n();
  const inReview = dare.status === "submitted";
  const progress = dareProgress(dare, now);
  const color = UrgencyColors[progress.urgency];

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
                {t("home.inReview")}
              </ThemedText>
            </ThemedView>
          ) : (
            <ThemedText type="small" style={{ color }}>
              {progressLabel(progress)}
            </ThemedText>
          )}
        </View>

        {/* Proof is in: the clock no longer matters */}
        {!inReview && <TimeProgressBar progress={progress} />}
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
});
