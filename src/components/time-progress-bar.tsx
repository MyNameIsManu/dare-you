import { StyleSheet, View } from "react-native";

import { UrgencyColors, type DareProgress } from "@/../utils/dare-progress";
import { useTheme } from "@/hooks/use-theme";

/** Thin bar: how much of a dare's time is used up, coloured by urgency. */
export function TimeProgressBar({ progress }: { progress: DareProgress }) {
  const theme = useTheme();

  return (
    <View
      style={[styles.track, { backgroundColor: theme.backgroundSelected }]}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(progress.elapsed * 100),
      }}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${progress.elapsed * 100}%`,
            backgroundColor: UrgencyColors[progress.urgency],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
